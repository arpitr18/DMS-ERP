import { z } from 'zod';
import { prisma } from '../db.js';
import { resolveLocation } from '../services/location.js';

const beatSchema = z.object({ name: z.string().trim().min(1).max(120), active: z.boolean().default(true), address: z.string().trim().optional().nullable(), stateId: z.string().optional().nullable(), cityId: z.string().optional().nullable() });
const salesmanSchema = z.object({
  name: z.string().trim().min(1).max(120), phone: z.string().trim().max(30).nullable().optional(),
  email: z.union([z.string().trim().email(), z.literal('')]).nullable().optional(),
  active: z.boolean().default(true), beatIds: z.array(z.string().min(1)).default([])
});

export async function listBeats(req, res) {
  res.json(await prisma.beat.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { retailers: true, salesmen: true } } } }));
}

export async function deleteBeat(req, res) {
  try {
    await prisma.beat.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    if (error.code === 'P2003') return res.status(409).json({ message: 'This beat is assigned to retailers or salesmen. Remove those assignments or deactivate the beat instead.' });
    if (error.code === 'P2025') return res.status(404).json({ message: 'Beat not found.' });
    throw error;
  }
}

export async function setBeatStatus(req, res) {
  const data = z.object({ active: z.boolean() }).parse(req.body);
  try {
    res.json(await prisma.beat.update({ where: { id: req.params.id }, data }));
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Beat not found.' });
    throw error;
  }
}
export async function saveBeat(req, res) {
  const data = beatSchema.parse(req.body);
  Object.assign(data, await resolveLocation(prisma, data));
  const duplicate = await prisma.beat.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' }, ...(req.params.id ? { id: { not: req.params.id } } : {}) } });
  if (duplicate) return res.status(409).json({ message: 'A beat with this name already exists.' });
  res.status(req.params.id ? 200 : 201).json(await (req.params.id
    ? prisma.beat.update({ where: { id: req.params.id }, data }) : prisma.beat.create({ data })));
}
export async function listSalesmen(req, res) {
  res.json(await prisma.salesman.findMany({ include: { beats: { include: { beat: true } } }, orderBy: { name: 'asc' } }));
}
export async function saveSalesman(req, res) {
  const { beatIds, ...data } = salesmanSchema.parse(req.body);
  const ids = [...new Set(beatIds)];
  const saved = await prisma.$transaction(async tx => {
    const existing = req.params.id ? await tx.salesman.findUnique({ where: { id: req.params.id }, include: { beats: true } }) : null;
    if (req.params.id && !existing) throw Object.assign(new Error('Salesman not found.'), { status: 404 });
    const beats = await tx.beat.findMany({ where: { id: { in: ids } } });
    if (beats.length !== ids.length || beats.some(b => !b.active && !existing?.beats.some(link => link.beatId === b.id))) {
      throw Object.assign(new Error('Select active beats from Beat Master.'), { status: 400 });
    }
    const links = { create: ids.map(beatId => ({ beatId })) };
    return req.params.id
      ? tx.salesman.update({ where: { id: req.params.id }, data: { ...data, beats: { deleteMany: {}, ...links } } })
      : tx.salesman.create({ data: { ...data, beats: links } });
  });
  res.status(req.params.id ? 200 : 201).json(saved);
}
