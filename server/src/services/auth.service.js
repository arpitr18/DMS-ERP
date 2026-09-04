import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { httpError } from '../utils/httpError.js';
import { createSessionToken } from '../utils/token.js';

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true
};

export async function authenticate(email, password) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw httpError(401, 'Invalid email or password.');
  }
  const publicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
  return { token: createSessionToken(publicUser), user: publicUser };
}
