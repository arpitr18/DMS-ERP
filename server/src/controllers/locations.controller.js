import { prisma } from '../db.js';
import { z } from 'zod';
import { reverseLocation, matchLocation } from '../services/reverseLocation.js';
export async function captureAddress(req, res) {
  const { latitude, longitude } = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).parse(req.body);
  const address = await reverseLocation(latitude, longitude);
  const [states, cities] = await Promise.all([prisma.locationState.findMany(), prisma.locationCity.findMany()]);
  res.json(matchLocation(address, states, cities));
}
export async function listStates(req, res) {
  res.json(await prisma.locationState.findMany({ orderBy: { name: 'asc' } }));
}
export async function listCities(req, res) {
  if (!req.query.stateId) return res.json([]);
  res.json(await prisma.locationCity.findMany({ where: { stateId: String(req.query.stateId) }, orderBy: { name: 'asc' } }));
}
