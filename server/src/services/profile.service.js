import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { httpError } from '../utils/httpError.js';
import { createSessionToken } from '../utils/token.js';
import { publicUserSelect } from './auth.service.js';

export async function getProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) throw httpError(404, 'User account not found.');
  return user;
}

export async function updateProfile(userId, input) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: input.name, email: input.email.toLowerCase() },
    select: publicUserSelect
  });
  return { user, token: createSessionToken(user) };
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw httpError(400, 'Current password is incorrect.');
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
