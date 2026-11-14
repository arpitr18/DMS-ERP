export function reviseDeliverySnapshot(snapshot, invoices) {
  const retained = new Set(invoices.map(invoice => invoice.id));
  const bills = snapshot.bills.filter(bill => retained.has(bill.id));
  const products = snapshot.products.flatMap(original => {
    const items = invoices.flatMap(invoice => invoice.items).filter(item => item.productCodeSnapshot === original.code);
    if (!items.length) return [];
    const quantity = items.reduce((sum, item) => sum + Number(item.quantity), 0);
    const ratio = quantity / original.quantity;
    return [{ ...original, quantity,
      pieces: original.pieces == null ? null : Number((original.pieces * ratio).toFixed(3)),
      weightKg: original.weightKg == null ? null : Number((original.weightKg * ratio).toFixed(6)),
      value: Number(items.reduce((sum, item) => sum + Number(item.lineTotal), 0).toFixed(2))
    }];
  });
  const { nextPlanId, previousPlanId, revision, ...original } = snapshot;
  return { ...original, bills, products, total: Number(bills.reduce((sum, bill) => sum + bill.total, 0).toFixed(2)) };
}
