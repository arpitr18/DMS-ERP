import { salesmanSchema } from '../validations/salesman.js';
import { normalizeEmail, normalizePhone } from '../../../shared/salesmanRules.js';
import { z } from 'zod';
import { prisma } from '../db.js';

const beatSchema = z.object({ name: z.string().trim().min(1).max(120), active: z.boolean().default(true) });

export async function listBeats(req, res) {
  res.json(await prisma.beat.findMany({ orderBy: { name: 'asc' }, include: {
    salesmen: { include: { salesman: { include: { schedule: true } } } },
    _count: { select: { retailers: true, salesmen: true } }
  } }));
}

export async function saveBeat(req, res) {
  const data = beatSchema.parse(req.body);
  const duplicate = await prisma.beat.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' }, ...(req.params.id ? { id: { not: req.params.id } } : {}) } });
  if (duplicate) return res.status(409).json({ message: 'A beat with this name already exists.' });
  try {
    const saved = req.params.id ? await prisma.beat.update({ where: { id: req.params.id }, data }) : await prisma.beat.create({ data });
    res.status(req.params.id ? 200 : 201).json(saved);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Beat not found.' });
    throw error;
  }
}

export async function deleteBeat(req, res) {
  try {
    await prisma.beat.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    if (error.code === 'P2003') return res.status(409).json({ message: 'Assigned beats cannot be deleted. Deactivate this beat instead.' });
    if (error.code === 'P2025') return res.status(404).json({ message: 'Beat not found.' });
    throw error;
  }
}

export async function setBeatStatus(req, res) {
  const data = z.object({ active: z.boolean() }).parse(req.body);
  try { res.json(await prisma.beat.update({ where: { id: req.params.id }, data })); }
  catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Beat not found.' });
    throw error;
  }
}

export async function listSalesmen(req, res) {
  res.json(await prisma.salesman.findMany({ include: { beats: { include: { beat: true } }, schedule: { include: { beat: true } } }, orderBy: { name: 'asc' } }));
}

export async function deleteSalesman(req, res) {
  try {
    await prisma.salesman.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Salesman not found.' });
    throw error;
  }
}

export async function saveSalesman(req, res) {
  const { schedule, ...data } = salesmanSchema.parse(req.body);
  const ids = [...new Set(schedule.map(entry => entry.beatId))];
  try {
    const saved = await prisma.$transaction(async tx => {
      // Serialize contact checks until the pending database uniqueness migration is applied.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(78314291)::text AS locked`;
      const contacts = await tx.salesman.findMany({ select: { id: true, phone: true, email: true } });
      const conflict = contacts.find(s => s.id !== req.params.id && (normalizePhone(s.phone) === data.phone || normalizeEmail(s.email) === data.email));
      if (conflict) throw Object.assign(new Error('Phone number or email is already assigned to another salesman.'), { status: 409 });
      const existing = req.params.id ? await tx.salesman.findUnique({ where: { id: req.params.id }, include: { schedule: true } }) : null;
      if (req.params.id && !existing) throw Object.assign(new Error('Salesman not found.'), { status: 404 });
      const beats = await tx.beat.findMany({ where: { id: { in: ids } } });
      if (beats.length !== ids.length || schedule.some(entry => {
        const beat = beats.find(b => b.id === entry.beatId);
        return !beat?.active && !existing?.schedule.some(old => old.day === entry.day && old.beatId === entry.beatId);
      })) throw Object.assign(new Error('Select active beats for new daily assignments.'), { status: 400 });
      const links = ids.map(beatId => ({ beatId }));
      const legacyDays = schedule.map(entry => entry.day);
      return req.params.id
        ? tx.salesman.update({ where: { id: req.params.id }, data: { ...data, visitDays: legacyDays, beats: { deleteMany: {}, create: links }, schedule: { deleteMany: {}, create: schedule } } })
        : tx.salesman.create({ data: { ...data, visitDays: legacyDays, beats: { create: links }, schedule: { create: schedule } } });
    }, { timeout: 15000 });
    res.status(req.params.id ? 200 : 201).json(saved);
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'Phone number or email is already assigned to another salesman.' });
    throw error;
  }
}
