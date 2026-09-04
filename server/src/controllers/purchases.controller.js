import { z } from 'zod';
import { prisma } from '../db.js';
import { money } from '../utils/numbers.js';

const schema = z.object({
  invoiceNumber: z.string().min(1), supplierName: z.string().optional().nullable(), purchaseDate: z.string().or(z.date()), notes: z.string().optional().nullable(),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.coerce.number().positive(), rate: z.coerce.number().nonnegative(), gstRate: z.coerce.number().min(0).max(100).optional() })).min(1)
});

export async function listPurchases(req, res) {
  const rows = await prisma.purchase.findMany({ include: { items: { include: { product: true } } }, orderBy: { purchaseDate: 'desc' }, take: 200 });
  res.json(rows);
}

export async function createPurchase(req, res) {
  const data = schema.parse(req.body);
  const purchase = await prisma.$transaction(async tx => {
    const productIds = data.items.map(i => i.productId);
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const map = new Map(products.map(p => [p.id, p]));
    if (products.length !== new Set(productIds).size) throw Object.assign(new Error('One or more products were not found.'), { status: 400 });
    const items = data.items.map(i => {
      const p = map.get(i.productId);
      const gstRate = i.gstRate ?? Number(p.gstRate);
      return { ...i, gstRate, lineTotal: money(i.quantity * i.rate * (1 + gstRate / 100)) };
    });
    const totalAmount = money(items.reduce((s, i) => s + i.lineTotal, 0));
    const created = await tx.purchase.create({ data: {
      invoiceNumber: data.invoiceNumber, supplierName: data.supplierName, purchaseDate: new Date(data.purchaseDate), notes: data.notes, totalAmount,
      items: { create: items.map(i => ({ productId: i.productId, quantity: i.quantity, rate: i.rate, gstRate: i.gstRate, lineTotal: i.lineTotal })) }
    } });
    for (const i of items) {
      await tx.inventoryTransaction.create({ data: { productId: i.productId, type: 'PURCHASE', quantityChange: i.quantity, unitCost: i.rate, referenceType: 'PURCHASE', referenceId: created.id, transactionDate: new Date(data.purchaseDate) } });
      await tx.product.update({ where: { id: i.productId }, data: { basePrice: i.rate } });
    }
    return created;
  });
  res.status(201).json(purchase);
}
