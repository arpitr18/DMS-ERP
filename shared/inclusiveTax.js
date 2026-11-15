// Calculate line schemes first, then allocate any additional bill discount in paise.
export function calculateInclusiveTotals(items, discount = 0) {
  const gross = items.map(item => Math.round(Number(item.quantity) * Number(item.rate) * 100));
  const schemes = items.map((item, index) => Math.min(gross[index], Math.max(0, item.schemeDiscount != null ? Math.round(Number(item.schemeDiscount)*100) : Math.round(gross[index] * Number(item.schemePercent || 0) / 100))));
  const net = gross.map((value, index) => value - schemes[index]);
  const subtotal = gross.reduce((sum, value) => sum + value, 0);
  const schemeDiscount = schemes.reduce((sum, value) => sum + value, 0);
  const netTotal = subtotal - schemeDiscount;
  const deduction = Math.min(Math.max(0, Math.round(Number(discount) * 100)), netTotal);
  let cumulative = 0;
  let allocated = 0;
  const lines = items.map((item, index) => {
    cumulative += net[index];
    const target = netTotal ? Math.round(cumulative * deduction / netTotal) : 0;
    const total = net[index] - (target - allocated);
    allocated = target;
    const taxable = Math.round(total / (1 + Number(item.gstRate) / 100));
    return { ...item, schemeDiscount: schemes[index] / 100, taxableAmount: taxable / 100, taxAmount: (total - taxable) / 100, lineTotal: total / 100 };
  });
  return {
    lines, subtotal: subtotal / 100, discount: (deduction + schemeDiscount) / 100,
    schemeDiscount: schemeDiscount / 100, additionalDiscount: deduction / 100,
    taxableAmount: lines.reduce((sum, item) => sum + Math.round(item.taxableAmount * 100), 0) / 100,
    totalTax: lines.reduce((sum, item) => sum + Math.round(item.taxAmount * 100), 0) / 100,
    total: (netTotal - deduction) / 100
  };
}
