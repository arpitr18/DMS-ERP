import { z } from 'zod';
import { prisma } from '../db.js';

const schema = z.object({
  categoryId: z.string().uuid(), amount: z.coerce.number().positive(), expenseDate: z.string().or(z.date()),
  description: z.string().min(2), paymentMode: z.enum(['CASH', 'UPI', 'BANK', 'OTHER']).default('CASH')
});

export async function listCategories(req, res) {
  res.json(await prisma.expenseCategory.findMany({ where: { active: true }, orderBy: { name: 'asc' } }));
}

export async function listExpenses(req, res) {
  const where = {};
  if (req.query.from || req.query.to) {
    where.expenseDate = {};
    if (req.query.from) where.expenseDate.gte = new Date(`${req.query.from}T00:00:00`);
    if (req.query.to) where.expenseDate.lte = new Date(`${req.query.to}T23:59:59.999`);
  }
  res.json(await prisma.expense.findMany({ where, include: { category: true }, orderBy: { expenseDate: 'desc' }, take: 300 }));
}

export async function createExpense(req, res) {
  const data = schema.parse(req.body);
  const row = await prisma.expense.create({ data: { ...data, expenseDate: new Date(data.expenseDate) } });
  res.status(201).json(row);
}

export async function updateExpense(req, res) {
  const data = schema.partial().parse(req.body);
  if (data.expenseDate) data.expenseDate = new Date(data.expenseDate);
  res.json(await prisma.expense.update({ where: { id: req.params.id }, data }));
}

export async function deleteExpense(req, res) {
  await prisma.expense.delete({ where: { id: req.params.id } });
  res.status(204).end();
}
