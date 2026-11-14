export function sortDeliveryBills(bills) {
  return [...bills].sort((left, right) =>
    String(left.beat || '').localeCompare(String(right.beat || ''), 'en', { sensitivity: 'base' }) ||
    Number(right.total) - Number(left.total) ||
    String(left.party || '').localeCompare(String(right.party || ''), 'en') ||
    String(left.invoiceNumber || '').localeCompare(String(right.invoiceNumber || ''), 'en')
  );
}

export function deliveryProductTotals(products) {
  return {
    items: new Set(products.map(product => product.code)).size,
    pieces: products.some(product => product.pieces == null) ? null : products.reduce((sum, product) => sum + Number(product.pieces), 0),
    weightKg: products.some(product => product.weightKg == null) ? null : products.reduce((sum, product) => sum + Number(product.weightKg), 0),
    value: products.reduce((sum, product) => sum + Number(product.value), 0)
  };
}
