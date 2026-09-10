import ExcelJS from 'exceljs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { retailerOutstanding } from '../services/outstanding.js';

const schema = z.object({
  code: z.string().min(1).transform(v => v.trim().toUpperCase()), name: z.string().min(1), market: z.string().min(1),
  gstin: z.string().optional().nullable(), phone: z.string().optional().nullable(),
  address: z.string().trim().min(5, 'Complete shop address is required.'),
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
  res.status(201).json(await prisma.retailer.create({ data: schema.parse(req.body) }));
}

export async function updateRetailer(req, res) {
  res.json(await prisma.retailer.update({ where: { id: req.params.id }, data: schema.partial().parse(req.body) }));
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
      market: get(row, 'market', 'area'), gstin: get(row, 'gstin', 'gst'), phone: get(row, 'phone', 'mobile'), address: get(row, 'address'),
      state: get(row, 'state'), openingOutstanding: get(row, 'openingoutstanding', 'opening outstanding') || 0,
      creditLimit: get(row, 'creditlimit', 'credit limit') || undefined
    };
    const parsed = schema.safeParse(raw);
    if (!parsed.success) errors.push({ row: rowNo, error: parsed.error.issues.map(i => i.message).join(', ') });
    else rows.push({ rowNo, data: parsed.data });
  });
  const codes = rows.map(r => r.data.code);
  if (new Set(codes).size !== codes.length) errors.push({ row: '-', error: 'Duplicate retailer codes exist inside the file.' });
  if (errors.length) return res.status(400).json({ message: 'Import validation failed. Nothing was imported.', errors });
  await prisma.$transaction(async tx => {
    for (const row of rows) await tx.retailer.upsert({ where: { code: row.data.code }, update: row.data, create: row.data });
    await tx.importLog.create({ data: { type: 'RETAILER_MASTER', fileName: req.file.originalname, rowsReceived: rows.length, rowsImported: rows.length, status: 'SUCCESS' } });
  });
  res.json({ message: `${rows.length} retailers imported successfully.`, rowsImported: rows.length });
}
