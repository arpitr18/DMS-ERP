import { z } from 'zod';
import { prisma } from '../db.js';
import { money } from '../utils/numbers.js';

const schema = z.object({
  invoiceNumber: z.string().trim().min(1), supplierName: z.string().optional().nullable(), purchaseDate: z.string().or(z.date()).refine(value => !Number.isNaN(new Date(value).getTime()), 'A valid purchase date is required.'), notes: z.string().optional().nullable(),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.coerce.number().positive(), rate: z.coerce.number().nonnegative(), gstRate: z.coerce.number().min(0).max(100).optional() })).min(1)
});

export async function listPurchases(req, res) {
  const where = {};
  if (req.query.from || req.query.to) {
    where.purchaseDate = {};
    if (req.query.from) where.purchaseDate.gte = new Date(`${req.query.from}T00:00:00`);
    if (req.query.to) where.purchaseDate.lte = new Date(`${req.query.to}T23:59:59.999`);
  }
  if (req.query.supplier) where.supplierName = String(req.query.supplier);
  const q = String(req.query.q || '').trim();
  if (q) where.OR = [{ invoiceNumber: { contains: q, mode: 'insensitive' } }, { supplierName: { contains: q, mode: 'insensitive' } }, { items: { some: { product: { name: { contains: q, mode: 'insensitive' } } } } }];
  const page = z.coerce.number().int().min(1).parse(req.query.page || 1);
  const rows = await prisma.purchase.findMany({ where, include: { items: { include: { product: true } } }, orderBy: [{ purchaseDate: 'desc' }, { id: 'desc' }], take: 200, skip: (page - 1) * 200 });
  res.json(rows);
}

export async function listSuppliers(req, res) {
  const rows = await prisma.purchase.findMany({ distinct: ['supplierName'], select: { supplierName: true }, orderBy: { supplierName: 'asc' } });
  res.json(rows.map(row => row.supplierName).filter(Boolean));
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

async function changePurchase(id, data) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const existing = await tx.purchase.findUnique({ where: { id }, include: { items: true } });
        if (!existing) throw Object.assign(new Error('Purchase not found.'), { status: 404 });
        const productIds = [...new Set([...existing.items, ...(data?.items || [])].map(i => i.productId))];
        const products = await tx.product.findMany({ where: { id: { in: productIds } } });
        const map = new Map(products.map(p => [p.id, p]));
        const items = (data?.items || []).map(item => {
          const product = map.get(item.productId);
          if (!product) throw Object.assign(new Error('Product not found.'), { status: 400 });
          const gstRate = item.gstRate ?? Number(product.gstRate);
          return { productId: item.productId, quantity: item.quantity, rate: item.rate, gstRate, lineTotal: money(item.quantity * item.rate * (1 + gstRate / 100)) };
        });
        for (const productId of productIds) {
          const stock = await tx.inventoryTransaction.aggregate({ where: { productId }, _sum: { quantityChange: true } });
          const oldQty = existing.items.filter(i => i.productId === productId).reduce((sum, i) => sum + Number(i.quantity), 0);
          const newQty = items.filter(i => i.productId === productId).reduce((sum, i) => sum + i.quantity, 0);
          if (newQty < oldQty && Number(stock._sum.quantityChange || 0) + newQty - oldQty < -0.000001) {
            throw Object.assign(new Error(`Cannot remove stock already used for ${map.get(productId)?.name || 'this product'}. Correct the quantity or related stock transactions first.`), { status: 409 });
          }
        }
        await tx.inventoryTransaction.deleteMany({ where: { referenceType: 'PURCHASE', referenceId: id } });
        let result = null;
        if (data) {
          await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
          result = await tx.purchase.update({ where: { id }, data: {
            invoiceNumber: data.invoiceNumber, supplierName: data.supplierName, purchaseDate: new Date(data.purchaseDate), notes: data.notes,
            totalAmount: money(items.reduce((sum, item) => sum + item.lineTotal, 0)), items: { create: items }
          } });
          for (const item of items) await tx.inventoryTransaction.create({ data: {
            productId: item.productId, type: 'PURCHASE', quantityChange: item.quantity, unitCost: item.rate,
            referenceType: 'PURCHASE', referenceId: id, transactionDate: new Date(data.purchaseDate)
          } });
        } else await tx.purchase.delete({ where: { id } });
        for (const productId of productIds) {
          const latestCost = await tx.inventoryTransaction.findFirst({
            where: { productId, type: { in: ['PURCHASE', 'OPENING'] }, unitCost: { not: null } },
            orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
          });
          await tx.product.update({ where: { id: productId }, data: { basePrice: latestCost?.unitCost ?? 0 } });
        }
        return result;
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error.code !== 'P2034') throw error;
      if (attempt === 2) throw Object.assign(new Error('Stock changed during this request. Please retry.'), { status: 409 });
    }
  }
}

export async function updatePurchase(req, res) {
  const data = schema.parse(req.body);
  res.json(await changePurchase(req.params.id, data));
}

export async function deletePurchase(req, res) {
  await changePurchase(req.params.id, null);
  res.status(204).end();
}
