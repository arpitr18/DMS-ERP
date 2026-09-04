import { prisma } from '../db.js';
import { retailerOutstanding } from '../services/outstanding.js';
import { money } from '../utils/numbers.js';

export async function getDashboard(req, res) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [todaySales, todayCollections, todayExpenses, monthSales, monthCollections, monthExpenses, retailers, productCount, inventoryAgg] = await Promise.all([
    prisma.invoice.aggregate({ where: { invoiceDate: { gte: todayStart, lt: tomorrow } }, _sum: { grandTotal: true }, _count: true }),
    prisma.payment.aggregate({ where: { paymentDate: { gte: todayStart, lt: tomorrow } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { expenseDate: { gte: todayStart, lt: tomorrow } }, _sum: { amount: true } }),
    prisma.invoice.aggregate({ where: { invoiceDate: { gte: monthStart, lt: nextMonth } }, _sum: { grandTotal: true } }),
    prisma.payment.aggregate({ where: { paymentDate: { gte: monthStart, lt: nextMonth } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { expenseDate: { gte: monthStart, lt: nextMonth } }, _sum: { amount: true } }),
    prisma.retailer.findMany({ where: { active: true } }),
    prisma.product.count({ where: { active: true } }),
    prisma.inventoryTransaction.groupBy({ by: ['productId'], _sum: { quantityChange: true } })
  ]);
  const outstandingValues = await Promise.all(retailers.map(r => retailerOutstanding(prisma, r.id)));
  const totalOutstanding = money(outstandingValues.reduce((s, v) => s + v, 0));
  const products = await prisma.product.findMany({ where: { active: true } });
  const stockMap = new Map(inventoryAgg.map(row => [row.productId, Number(row._sum.quantityChange || 0)]));
  let inventoryValue = 0; let lowStockCount = 0;
  for (const p of products) {
    const stock = stockMap.get(p.id) || 0;
    inventoryValue += stock * Number(p.basePrice);
    if (stock <= Number(p.minStock)) lowStockCount++;
  }
  const sevenDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart); d.setDate(d.getDate() - i);
    const e = new Date(d); e.setDate(e.getDate() + 1);
    const [sales, collections] = await Promise.all([
      prisma.invoice.aggregate({ where: { invoiceDate: { gte: d, lt: e } }, _sum: { grandTotal: true } }),
      prisma.payment.aggregate({ where: { paymentDate: { gte: d, lt: e } }, _sum: { amount: true } })
    ]);
    sevenDays.push({ date: d.toISOString().slice(0, 10), sales: Number(sales._sum.grandTotal || 0), collections: Number(collections._sum.amount || 0) });
  }
  res.json({
    today: { sales: Number(todaySales._sum.grandTotal || 0), bills: todaySales._count, collections: Number(todayCollections._sum.amount || 0), expenses: Number(todayExpenses._sum.amount || 0) },
    month: { sales: Number(monthSales._sum.grandTotal || 0), collections: Number(monthCollections._sum.amount || 0), expenses: Number(monthExpenses._sum.amount || 0) },
    totalOutstanding, inventoryValue: money(inventoryValue), lowStockCount, retailerCount: retailers.length, productCount, sevenDays
  });
}
