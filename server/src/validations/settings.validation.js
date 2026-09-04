import { z } from 'zod';

export const updateBusinessSettingsSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  gstin: z.string().trim().max(30).optional().default(''),
  address: z.string().trim().max(500).optional().default(''),
  phone: z.string().trim().max(30).optional().default(''),
  state: z.string().trim().max(80).optional().default(''),
  invoicePrefix: z.string().trim().min(1).max(12).regex(
    /^[A-Za-z0-9_-]+$/,
    'Invoice prefix can only contain letters, numbers, hyphens and underscores.'
  )
});
