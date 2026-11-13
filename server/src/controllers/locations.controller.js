import { prisma } from '../db.js';
export async function listStates(req, res) {
  res.json(await prisma.locationState.findMany({ orderBy: { name: 'asc' } }));
}
export async function listCities(req, res) {
  if (!req.query.stateId) return res.json([]);
  res.json(await prisma.locationCity.findMany({ where: { stateId: String(req.query.stateId) }, orderBy: { name: 'asc' } }));
}
