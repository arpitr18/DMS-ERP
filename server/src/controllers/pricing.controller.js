import ExcelJS from 'exceljs';
import { z } from 'zod';
import { prisma } from '../db.js';

export async function listRetailerPrices(req, res) {
  const products = await prisma.product.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  const prices = await prisma.retailerProductPrice.findMany({ where: { retailerId: req.params.retailerId } });
  const map = new Map(prices.map(p => [p.productId, p]));
  res.json(products.map(p => ({
    productId: p.id, code: p.code, name: p.name, mrp: p.mrp, defaultSellingRate: p.defaultSellingRate,
    customSellingRate: map.get(p.id)?.sellingRate ?? null, effectiveRate: map.get(p.id)?.sellingRate ?? p.defaultSellingRate,
    source: map.has(p.id) ? 'CUSTOM' : 'DEFAULT'
  })));
}

export async function setRetailerPrice(req, res) {
  const { sellingRate } = z.object({ sellingRate: z.coerce.number().positive() }).parse(req.body);
  const row = await prisma.retailerProductPrice.upsert({
    where: { retailerId_productId: { retailerId: req.params.retailerId, productId: req.params.productId } },
    update: { sellingRate, effectiveFrom: new Date() },
    create: { retailerId: req.params.retailerId, productId: req.params.productId, sellingRate }
  });
  res.json(row);
}

export async function deleteRetailerPrice(req, res) {
  await prisma.retailerProductPrice.delete({ where: { retailerId_productId: { retailerId: req.params.retailerId, productId: req.params.productId } } });
  res.status(204).end();
}

export async function importRetailerPrices(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Excel file is required.' });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return res.status(400).json({ message: 'Workbook has no worksheet.' });
  const headers = {};
  sheet.getRow(1).eachCell((cell, col) => { headers[String(cell.value || '').trim().toLowerCase()] = col; });
  const col = (...names) => names.map(name => headers[name]).find(Boolean);
  const retailerColumn = col('retailercode', 'retailer code');
  const productColumn = col('productcode', 'product code');
  const rateColumn = col('sellingrate', 'selling rate');
  if (!retailerColumn || !productColumn || !rateColumn) return res.status(400).json({ message: 'Required headers: retailerCode, productCode, sellingRate.' });
  const rows = []; const errors = [];
  sheet.eachRow((row, rowNo) => {
    if (rowNo === 1) return;
    const retailerCode = String(row.getCell(retailerColumn).value || '').trim().toUpperCase();
    const productCode = String(row.getCell(productColumn).value || '').trim().toUpperCase();
    const sellingRate = Number(row.getCell(rateColumn).value);
    if (!retailerCode || !productCode || !Number.isFinite(sellingRate) || sellingRate <= 0) errors.push({ row: rowNo, error: 'Invalid retailerCode, productCode or sellingRate.' });
    else rows.push({ rowNo, retailerCode, productCode, sellingRate });
  });
  if (errors.length) return res.status(400).json({ message: 'Import validation failed. Nothing was imported.', errors });
  const retailerCodes = [...new Set(rows.map(r => r.retailerCode))];
  const productCodes = [...new Set(rows.map(r => r.productCode))];
  const [retailers, products] = await Promise.all([
    prisma.retailer.findMany({ where: { code: { in: retailerCodes } } }),
    prisma.product.findMany({ where: { code: { in: productCodes } } })
  ]);
  const retailerMap = new Map(retailers.map(x => [x.code, x]));
  const productMap = new Map(products.map(x => [x.code, x]));
  for (const row of rows) {
    if (!retailerMap.has(row.retailerCode)) errors.push({ row: row.rowNo, error: `Unknown retailer ${row.retailerCode}` });
    if (!productMap.has(row.productCode)) errors.push({ row: row.rowNo, error: `Unknown product ${row.productCode}` });
  }
  if (errors.length) return res.status(400).json({ message: 'Import validation failed. Nothing was imported.', errors });
  await prisma.$transaction(async tx => {
    for (const row of rows) {
      const retailerId = retailerMap.get(row.retailerCode).id;
      const productId = productMap.get(row.productCode).id;
      await tx.retailerProductPrice.upsert({
        where: { retailerId_productId: { retailerId, productId } }, update: { sellingRate: row.sellingRate, effectiveFrom: new Date() },
        create: { retailerId, productId, sellingRate: row.sellingRate }
      });
    }
    await tx.importLog.create({ data: { type: 'SELLING_MASTER', fileName: req.file.originalname, rowsReceived: rows.length, rowsImported: rows.length, status: 'SUCCESS' } });
  });
  res.json({ message: `${rows.length} selling rates imported successfully.`, rowsImported: rows.length });
}
