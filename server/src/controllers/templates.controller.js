import ExcelJS from 'exceljs';
import { prisma } from '../db.js';

export const templateColumns = {
  products: ['code', 'name', 'category', 'basePrice', 'defaultSellingRate', 'mrp', 'gstRate', 'hsnCode', 'unit', 'unitsPerCarton', 'pieceWeightGrams', 'caseWeightKg', 'purchaseGstRate', 'minStock', 'openingQty'],
  retailers: ['code', 'name', 'ownerName', 'beat', 'gstin', 'phone', 'building', 'street', 'landmark', 'pincode', 'address', 'state', 'city', 'openingOutstanding', 'creditLimit'],
  pricing: ['retailerCode', 'productCode', 'sellingRate']
};

export async function downloadProductMaster(req, res) {
  const columns = [...templateColumns.products.filter(name => name !== 'openingQty'), 'active'];
  const products = await prisma.product.findMany({ orderBy: [{ name: 'asc' }, { code: 'asc' }] });
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Product Master');
  sheet.columns = columns.map(header => ({ header, key: header, width: Math.max(18, header.length + 3) }));
  const numeric = new Set(['basePrice', 'defaultSellingRate', 'mrp', 'gstRate', 'unitsPerCarton', 'pieceWeightGrams', 'caseWeightKg', 'purchaseGstRate', 'minStock']);
  for (const product of products) sheet.addRow(Object.fromEntries(columns.map(key => [key, product[key] == null ? null : numeric.has(key) ? Number(product[key]) : product[key]])));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  for (const key of ['code', 'hsnCode']) sheet.getColumn(key).numFmt = '@';
  for (const key of ['basePrice', 'defaultSellingRate', 'mrp']) sheet.getColumn(key).numFmt = '0.00';
  res.attachment('product-master.xlsx');
  res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(Buffer.from(await workbook.xlsx.writeBuffer()));
}

export function downloadTemplate(type) {
  return async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Import');
    sheet.columns = templateColumns[type].map(header => ({ header, key: header, width: Math.max(18, header.length + 3) }));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    // Keep identifiers as text, including numeric codes and phone numbers.
    for (const name of ['code', 'retailerCode', 'productCode', 'phone', 'hsnCode']) {
      if (templateColumns[type].includes(name)) sheet.getColumn(name).numFmt = '@';
    }
    res.attachment(`${type}-import-template.xlsx`);
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(Buffer.from(await workbook.xlsx.writeBuffer()));
  };
}
