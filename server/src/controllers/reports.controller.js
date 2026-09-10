import { prisma } from '../db.js';
import { dateRange, money } from '../utils/numbers.js';

export async function getProfitReport(req, res) {
  const { start, end } = dateRange(req.query);
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || start > end) return res.status(400).json({message:'Choose a valid date range.'});
  const scope = { ...(req.query.retailerId ? {retailerId:String(req.query.retailerId)} : {}), ...(req.query.market ? {retailer:{market:String(req.query.market)}} : {}) };
  const scoped = Boolean(req.query.retailerId || req.query.market);
  const invoices = await prisma.invoice.findMany({ where: { ...scope, invoiceDate: { gte: start, lte: end } }, include: { items: true } });
  const expenses = await prisma.expense.aggregate({ where: { expenseDate: { gte: start, lte: end } }, _sum: { amount: true } });
  const sales = money(invoices.reduce((s, i) => s + Number(i.grandTotal), 0));
  const taxableSales = money(invoices.reduce((s, i) => s + Number(i.taxableAmount), 0));
  const cogs = money(invoices.flatMap(i => i.items).reduce((s, item) => s + Number(item.quantity) * Number(item.costRate), 0));
  const grossProfit = money(taxableSales - cogs);
  const operatingExpenses = scoped ? null : money(expenses._sum.amount || 0);
  const netProfit = scoped ? null : money(grossProfit - operatingExpenses);
  res.json({ scoped, from: start, to: end, sales, taxableSales, cogs, grossProfit, operatingExpenses, netProfit, invoiceCount: invoices.length });
}

export async function getSummaryReport(req, res) {
  const { start, end } = dateRange(req.query);
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || start > end) return res.status(400).json({message:'Choose a valid date range.'});
  const scope = { ...(req.query.retailerId ? {retailerId:String(req.query.retailerId)} : {}), ...(req.query.market ? {retailer:{market:String(req.query.market)}} : {}) };
  const scoped = Boolean(req.query.retailerId || req.query.market);
  const [sales, collections, purchases, expenses] = await Promise.all([
    prisma.invoice.aggregate({ where: { ...scope, invoiceDate: { gte: start, lte: end } }, _sum: { grandTotal: true }, _count: true }),
    prisma.payment.aggregate({ where: { ...scope, paymentDate: { gte: start, lte: end } }, _sum: { amount: true }, _count: true }),
    prisma.purchase.aggregate({ where: { purchaseDate: { gte: start, lte: end } }, _sum: { totalAmount: true }, _count: true }),
    prisma.expense.aggregate({ where: { expenseDate: { gte: start, lte: end } }, _sum: { amount: true }, _count: true })
  ]);
  res.json({
    scoped, from: start, to: end,
    sales: Number(sales._sum.grandTotal || 0), bills: sales._count,
    collections: Number(collections._sum.amount || 0), collectionCount: collections._count,
    purchases: scoped ? null : Number(purchases._sum.totalAmount || 0), purchaseCount: purchases._count,
    expenses: scoped ? null : Number(expenses._sum.amount || 0), expenseCount: expenses._count
  });
}
