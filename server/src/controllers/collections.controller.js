import { z } from 'zod';
import { prisma } from '../db.js';
import { retailerOutstanding } from '../services/outstanding.js';

const schema = z.object({
  retailerId: z.string().uuid(), invoiceId: z.string().uuid().optional().nullable(), amount: z.coerce.number().positive(),
  paymentDate: z.string().or(z.date()), method: z.enum(['CASH', 'UPI', 'BANK', 'CHEQUE', 'OTHER']).default('CASH'),
  reference: z.string().optional().nullable(), notes: z.string().optional().nullable()
});

export async function listOutstanding(req, res) {
  const retailers = await prisma.retailer.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  const rows = await Promise.all(retailers.map(async retailer => ({
    id: retailer.id, code: retailer.code, name: retailer.name, market: retailer.market, creditLimit: retailer.creditLimit,
    outstanding: await retailerOutstanding(prisma, retailer.id)
  })));
  res.json(rows.filter(r => r.outstanding !== 0));
}

export async function listCollections(req, res) {
  const rows = await prisma.payment.findMany({ include: { retailer: true, invoice: { select: { invoiceNumber: true } } }, orderBy: { paymentDate: 'desc' }, take: 300 });
  res.json(rows);
}

export async function createCollection(req, res) {
  const data = schema.parse(req.body);
  const payment = await prisma.$transaction(async tx => {
    const retailer = await tx.retailer.findUnique({ where: { id: data.retailerId } });
    if (!retailer) throw Object.assign(new Error('Retailer not found.'), { status: 404 });
    if (data.invoiceId) {
      const invoice = await tx.invoice.findUnique({ where: { id: data.invoiceId } });
      if (!invoice || invoice.retailerId !== retailer.id) throw Object.assign(new Error('Invoice does not belong to the selected retailer.'), { status: 400 });
    }
    const created = await tx.payment.create({ data: { ...data, paymentDate: new Date(data.paymentDate) } });
    if (data.invoiceId) {
      const paid = await tx.payment.aggregate({ where: { invoiceId: data.invoiceId }, _sum: { amount: true } });
      const invoice = await tx.invoice.findUnique({ where: { id: data.invoiceId } });
      const received = Number(paid._sum.amount || 0);
      const due = Math.max(0, Number(invoice.grandTotal) - received);
      await tx.invoice.update({ where: { id: invoice.id }, data: { amountReceived: received, balanceDue: due, status: due <= 0 ? 'PAID' : 'OPEN' } });
    }
    return created;
  });
  res.status(201).json(payment);
}
