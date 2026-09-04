export async function retailerOutstanding(tx, retailerId) {
  const retailer = await tx.retailer.findUnique({ where: { id: retailerId } });
  if (!retailer) throw Object.assign(new Error('Retailer not found.'), { status: 404 });
  const invoiceAgg = await tx.invoice.aggregate({ where: { retailerId }, _sum: { grandTotal: true } });
  const paymentAgg = await tx.payment.aggregate({ where: { retailerId }, _sum: { amount: true } });
  return Number(retailer.openingOutstanding) + Number(invoiceAgg._sum.grandTotal || 0) - Number(paymentAgg._sum.amount || 0);
}
