import ExcelJS from 'exceljs';
import { z } from 'zod';
import { prisma } from '../db.js';

const productSchema = z.object({
  code: z.string().min(1).transform(v => v.trim().toUpperCase()), name: z.string().min(1).transform(v => v.trim()),
  category: z.string().optional().nullable(), basePrice: z.coerce.number().nonnegative(), defaultSellingRate: z.coerce.number().nonnegative(),
  mrp: z.coerce.number().nonnegative(), gstRate: z.coerce.number().min(0).max(100), hsnCode: z.string().optional().nullable(),
  unit: z.string().optional().default('PCS'), unitsPerCarton: z.coerce.number().int().positive().optional().nullable(),
  minStock: z.coerce.number().nonnegative().optional().default(0), openingQty: z.coerce.number().nonnegative().optional().default(0),
  active: z.boolean().optional().default(true)
});

export async function listProducts(req, res) {
  const q = String(req.query.q || '').trim();
  const products = await prisma.product.findMany({
    where: q ? { OR: [{ code: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }, { category: { contains: q, mode: 'insensitive' } }] } : {},
    orderBy: [{ active: 'desc' }, { name: 'asc' }]
  });
  res.json(products);
}

export async function createProduct(req, res) {
  const data = productSchema.parse(req.body);
  const { openingQty, ...productData } = data;
  const product = await prisma.$transaction(async tx => {
    const created = await tx.product.create({ data: productData });
    if (openingQty > 0) await tx.inventoryTransaction.create({ data: { productId: created.id, type: 'OPENING', quantityChange: openingQty, unitCost: data.basePrice, referenceType: 'PRODUCT', referenceId: created.id, note: 'Opening stock' } });
    return created;
  });
  res.status(201).json(product);
}

export async function updateProduct(req, res) {
  const data = productSchema.omit({ openingQty: true }).partial().parse(req.body);
  res.json(await prisma.product.update({ where: { id: req.params.id }, data }));
}

export async function importProducts(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Excel file is required.' });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return res.status(400).json({ message: 'Workbook has no worksheet.' });
  const headers = {};
  sheet.getRow(1).eachCell((cell, col) => { headers[String(cell.value || '').trim().toLowerCase()] = col; });
  const value = (row, names) => {
    for (const name of names) if (headers[name]) return row.getCell(headers[name]).value;
    return undefined;
  };
  const parsed = []; const errors = [];
  sheet.eachRow((row, rowNo) => {
    if (rowNo === 1) return;
    const raw = {
      code: value(row, ['code', 'productcode', 'product code']), name: value(row, ['name', 'productname', 'product name']),
      category: value(row, ['category']), basePrice: value(row, ['baseprice', 'base price', 'purchaseprice', 'purchase price']),
      defaultSellingRate: value(row, ['defaultsellingrate', 'default selling rate', 'sellingrate', 'selling rate']), mrp: value(row, ['mrp']),
      gstRate: value(row, ['gstrate', 'gst rate', 'gst']), hsnCode: value(row, ['hsncode', 'hsn code', 'hsn']), unit: value(row, ['unit']) || 'PCS',
      unitsPerCarton: value(row, ['unitspercarton', 'units per carton']), minStock: value(row, ['minstock', 'min stock']) || 0,
      openingQty: value(row, ['openingqty', 'opening qty', 'openingstock', 'opening stock']) || 0
    };
    const result = productSchema.safeParse(raw);
    if (!result.success) errors.push({ row: rowNo, errors: result.error.issues.map(i => i.message).join(', ') });
    else parsed.push({ rowNo, data: result.data });
  });
  const codes = parsed.map(x => x.data.code);
  if (new Set(codes).size !== codes.length) errors.push({ row: '-', errors: 'Duplicate product codes exist inside the file.' });
  if (errors.length) return res.status(400).json({ message: 'Import validation failed. Nothing was imported.', errors, rowsReceived: sheet.rowCount - 1 });
  const mode = req.body.mode === 'new-only' ? 'new-only' : 'upsert';
  const imported = await prisma.$transaction(async tx => {
    let count = 0;
    for (const item of parsed) {
      const existing = await tx.product.findUnique({ where: { code: item.data.code } });
      if (existing && mode === 'new-only') throw Object.assign(new Error(`Product ${item.data.code} already exists.`), { status: 409 });
      const { openingQty, ...data } = item.data;
      const product = existing ? await tx.product.update({ where: { id: existing.id }, data }) : await tx.product.create({ data });
      if (!existing && openingQty > 0) await tx.inventoryTransaction.create({ data: { productId: product.id, type: 'OPENING', quantityChange: openingQty, unitCost: data.basePrice, referenceType: 'IMPORT', note: `Opening stock from ${req.file.originalname}` } });
      count++;
    }
    await tx.importLog.create({ data: { type: 'PRODUCT_MASTER', fileName: req.file.originalname, rowsReceived: parsed.length, rowsImported: count, status: 'SUCCESS' } });
    return count;
  });
  res.json({ message: `${imported} products imported successfully.`, rowsImported: imported });
}
