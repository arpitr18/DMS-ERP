export function deliverySnapshot(invoices, vehicle) {
  const products = new Map();
  const bills = invoices.map(invoice => {
    for (const item of invoice.items) {
      const p = item.product;
      const quantity = Number(item.quantity);
      const unit = p.unit || 'PCS';
      const pcs = unit === 'PCS' ? quantity : ['BOX','CASE','CARTON'].includes(unit) && p.unitsPerCarton ? quantity * p.unitsPerCarton : null;
      const weight = unit === 'KG' ? quantity : pcs != null && p.pieceWeightGrams ? pcs * Number(p.pieceWeightGrams) / 1000 : null;
      const key = `${item.productId}|${unit}`;
      const row = products.get(key) || { code: item.productCodeSnapshot, name: item.productNameSnapshot, unit, quantity: 0, pieces: 0, weightKg: 0, value: 0 };
      row.quantity += quantity;
      row.pieces = pcs == null || row.pieces == null ? null : row.pieces + pcs;
      row.weightKg = weight == null || row.weightKg == null ? null : row.weightKg + weight;
      row.value += Number(item.lineTotal);
      products.set(key, row);
    }
    return { id: invoice.id, invoiceNumber: invoice.invoiceNumber, party: invoice.retailerNameSnapshot, retailerId: invoice.retailerId, beat: invoice.retailer.market, total: Number(invoice.grandTotal), address: [invoice.retailerAddressSnapshot, invoice.retailerStateSnapshot].filter(Boolean).join(', ') };
  });
  return { vehicle: { name: vehicle.name || null, number: vehicle.number, driverName: vehicle.driverName, phone: vehicle.phone }, bills, products: [...products.values()], total: bills.reduce((sum, bill) => sum + bill.total, 0) };
}
