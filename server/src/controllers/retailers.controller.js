import ExcelJS from 'exceljs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { retailerOutstanding } from '../services/outstanding.js';
import { validateRetailerBeat } from '../services/retailerBeat.js';
import { resolveLocation } from '../services/location.js';
import { retailerAddress, retailerCode } from '../services/retailerAddress.js';

const schema = z.object({
  ownerName: z.string().trim().optional().nullable(), building: z.string().trim().optional().nullable(), street: z.string().trim().optional().nullable(), landmark: z.string().trim().optional().nullable(),
  pincode: z.union([z.string().regex(/^[1-9]\d{5}$/), z.literal('')]).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(), longitude: z.number().min(-180).max(180).optional().nullable(),
  stateId: z.string().optional().nullable(), cityId: z.string().optional().nullable(), city: z.string().optional().nullable(),
  code: z.string().transform(v => v.trim().toUpperCase()).optional(), name: z.string().min(1), market: z.string().min(1),
  gstin: z.string().optional().nullable(), phone: z.string().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  state: z.string().trim().min(2, 'State is required.'), openingOutstanding: z.coerce.number().optional().default(0),
  creditLimit: z.coerce.number().optional().nullable(), active: z.boolean().optional().default(true)
});

export async function listRetailers(req, res) {
  const q = String(req.query.q || '').trim();
  const retailers = await prisma.retailer.findMany({
    where: q ? { OR: [{ code: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }, { market: { contains: q, mode: 'insensitive' } }, { gstin: { contains: q, mode: 'insensitive' } }] } : {},
    orderBy: [{ active: 'desc' }, { name: 'asc' }]
  });
  res.json(await Promise.all(retailers.map(async r => ({ ...r, outstanding: await retailerOutstanding(prisma, r.id) }))));
}

export async function createRetailer(req, res) {
  const data = schema.parse(req.body);
  res.status(201).json(await prisma.$transaction(async tx => {
    await validateRetailerBeat(tx, data.market);
    Object.assign(data, await resolveLocation(tx, data));
    Object.assign(data, retailerAddress(data));
    if (!data.ownerName?.trim() || !data.building?.trim() || !data.street?.trim()) throw Object.assign(new Error('Store owner and structured address are required.'), { status: 400 });
    data.code = await retailerCode(tx, data);
    return tx.retailer.create({ data });
  }));
}

export async function updateRetailer(req, res) {
  const data = schema.partial().parse(req.body);
  res.json(await prisma.$transaction(async tx => {
    const existing = await tx.retailer.findUnique({ where: { id: req.params.id } });
    if (!existing) throw Object.assign(new Error('Retailer not found.'), { status: 404 });
    if (data.market !== undefined) await validateRetailerBeat(tx, data.market, existing.market);
    if (data.stateId || data.cityId || data.city || (data.state !== undefined && data.state !== existing.state)) Object.assign(data, await resolveLocation(tx, data, existing));
    if (data.code && data.code !== existing.code) throw Object.assign(new Error('Existing retailer codes cannot be changed.'), { status: 400 });
    Object.assign(data, retailerAddress(data, existing));
    return tx.retailer.update({ where: { id: req.params.id }, data });
  }));
}

export async function getRetailerLedger(req, res) {
  const retailer = await prisma.retailer.findUnique({ where: { id: req.params.id } });
  if (!retailer) return res.status(404).json({ message: 'Retailer not found.' });
  const [invoices, payments] = await Promise.all([
    prisma.invoice.findMany({ where: { retailerId: retailer.id }, select: { id: true, invoiceNumber: true, invoiceDate: true, grandTotal: true }, orderBy: { invoiceDate: 'asc' } }),
    prisma.payment.findMany({ where: { retailerId: retailer.id }, select: { id: true, paymentDate: true, amount: true, method: true, reference: true }, orderBy: { paymentDate: 'asc' } })
  ]);
  let balance = Number(retailer.openingOutstanding);
  const entries = [{ date: retailer.createdAt, type: 'OPENING', reference: 'Opening Outstanding', debit: Number(retailer.openingOutstanding), credit: 0, balance }];
  const merged = [
    ...invoices.map(i => ({ date: i.invoiceDate, type: 'INVOICE', reference: i.invoiceNumber, debit: Number(i.grandTotal), credit: 0 })),
    ...payments.map(p => ({ date: p.paymentDate, type: 'PAYMENT', reference: p.reference || p.method, debit: 0, credit: Number(p.amount) }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date));
  for (const entry of merged) { balance += entry.debit - entry.credit; entries.push({ ...entry, balance }); }
  res.json({ retailer, entries, outstanding: balance });
}

export async function importRetailers(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Excel file is required.' });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return res.status(400).json({ message: 'Workbook has no worksheet.' });
  const headers = {};
  sheet.getRow(1).eachCell((cell, col) => { headers[String(cell.value || '').trim().toLowerCase()] = col; });
  const get = (row, ...names) => { for (const name of names) if (headers[name]) return row.getCell(headers[name]).value; };
  const rows = []; const errors = [];
  sheet.eachRow((row, rowNo) => {
    if (rowNo === 1) return;
    const raw = {
      code: get(row, 'code', 'retailercode', 'retailer code'), name: get(row, 'name', 'retailername', 'retailer name', 'storename', 'store name'),
      market: get(row, 'beat', 'market', 'area'), gstin: get(row, 'gstin', 'gst'), phone: get(row, 'phone', 'mobile'), address: get(row, 'address'),
      state: get(row, 'state'), city: get(row, 'city'), openingOutstanding: get(row, 'openingoutstanding', 'opening outstanding') || 0,
      ownerName: get(row, 'ownername', 'owner name'), building: get(row, 'building'), street: get(row, 'street'), landmark: get(row, 'landmark'), pincode: get(row, 'pincode') == null ? undefined : String(get(row, 'pincode')),
      creditLimit: get(row, 'creditlimit', 'credit limit') || undefined
    };
    if (typeof raw.phone === 'number') raw.phone = String(raw.phone);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) errors.push({ row: rowNo, error: parsed.error.issues.map(i => i.message).join(', ') });
    else rows.push({ rowNo, data: parsed.data });
  });
  const codes = rows.map(r => r.data.code).filter(Boolean);
  if (new Set(codes).size !== codes.length) errors.push({ row: '-', error: 'Duplicate retailer codes exist inside the file.' });
  if (errors.length) return res.status(400).json({ message: 'Import validation failed. Nothing was imported.', errors });
  await prisma.$transaction(async tx => {
    for (const row of rows) {
      const existing = row.data.code ? await tx.retailer.findUnique({ where: { code: row.data.code } }) : null;
      await validateRetailerBeat(tx, row.data.market, existing?.market);
      Object.assign(row.data, await resolveLocation(tx, row.data, existing));
      Object.assign(row.data, retailerAddress(row.data, existing));
      if (!existing) {
        if (!row.data.ownerName?.trim() || !row.data.building?.trim() || !row.data.street?.trim()) throw Object.assign(new Error(`Row ${row.rowNo}: Store owner, building and street are required for a new retailer.`), { status: 400 });
        row.data.code = await retailerCode(tx, row.data);
      }
      await tx.retailer.upsert({ where: { code: row.data.code }, update: row.data, create: row.data });
    }
    await tx.importLog.create({ data: { type: 'RETAILER_MASTER', fileName: req.file.originalname, rowsReceived: rows.length, rowsImported: rows.length, status: 'SUCCESS' } });
  });
  res.json({ message: `${rows.length} retailers imported successfully.`, rowsImported: rows.length });
}
