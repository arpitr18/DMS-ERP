import { z } from 'zod';
import { prisma } from '../db.js';

export async function listInventory(req, res) {
  const products = await prisma.product.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  const grouped = await prisma.inventoryTransaction.groupBy({ by: ['productId'], _sum: { quantityChange: true } });
  const map = new Map(grouped.map(g => [g.productId, Number(g._sum.quantityChange || 0)]));
  res.json(products.map(p => ({ ...p, stock: map.get(p.id) || 0, stockValue: (map.get(p.id) || 0) * Number(p.basePrice), lowStock: (map.get(p.id) || 0) <= Number(p.minStock) })));
}

export async function adjustInventory(req, res) {
  const data = z.object({ productId: z.string().uuid(), quantityChange: z.coerce.number().refine(v => v !== 0), note: z.string().min(2) }).parse(req.body);
  const txn = await prisma.inventoryTransaction.create({ data: { productId: data.productId, type: 'ADJUSTMENT', quantityChange: data.quantityChange, referenceType: 'MANUAL', note: data.note } });
  res.status(201).json(txn);
}

export async function listTransactions(req, res) {
  const rows = await prisma.inventoryTransaction.findMany({ where: { productId: req.params.productId }, orderBy: { transactionDate: 'desc' }, take: 300 });
  res.json(rows);
}
