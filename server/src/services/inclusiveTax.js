// Allocate discounts in paise so rounded lines always add up to the bill total.
export function calculateInclusiveTotals(items, discount = 0) {
  const gross = items.map(item => Math.round(Number(item.quantity) * Number(item.rate) * 100));
  const subtotal = gross.reduce((sum, value) => sum + value, 0);
  const deduction = Math.min(Math.max(0, Math.round(Number(discount) * 100)), subtotal);
  let cumulative = 0;
  let allocated = 0;
  const lines = items.map((item, index) => {
    cumulative += gross[index];
    const target = subtotal ? Math.round(cumulative * deduction / subtotal) : 0;
    const total = gross[index] - (target - allocated);
    allocated = target;
    const taxable = Math.round(total / (1 + Number(item.gstRate) / 100));
    return { ...item, taxableAmount: taxable / 100, taxAmount: (total - taxable) / 100, lineTotal: total / 100 };
  });
  return {
    lines, subtotal: subtotal / 100, discount: deduction / 100,
    taxableAmount: lines.reduce((sum, item) => sum + Math.round(item.taxableAmount * 100), 0) / 100,
    totalTax: lines.reduce((sum, item) => sum + Math.round(item.taxAmount * 100), 0) / 100,
    total: (subtotal - deduction) / 100
  };
}
