import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6).max(100),
  newPassword: z.string().min(8).max(100)
}).refine(data => data.currentPassword !== data.newPassword, {
  path: ['newPassword'],
  message: 'New password must be different from the current password.'
});
