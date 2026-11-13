import ExcelJS from 'exceljs';

export const templateColumns = {
  products: ['code', 'name', 'category', 'basePrice', 'defaultSellingRate', 'mrp', 'gstRate', 'hsnCode', 'unit', 'unitsPerCarton', 'pieceWeightGrams', 'caseWeightKg', 'purchaseGstRate', 'minStock', 'openingQty'],
  retailers: ['code', 'name', 'beat', 'gstin', 'phone', 'address', 'state', 'city', 'openingOutstanding', 'creditLimit'],
  pricing: ['retailerCode', 'productCode', 'sellingRate']
};

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
