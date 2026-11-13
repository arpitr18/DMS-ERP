import { z } from 'zod';
import { normalizeEmail, normalizePhone, requiredDays, weekDays } from '../../../shared/salesmanRules.js';

export const salesmanSchema = z.object({
  name: z.string().trim().min(1).max(120), category: z.string().trim().min(1),
  phone: z.string().transform(normalizePhone).refine(value => /^[0-9]{10}$/.test(value), 'Enter a valid 10-digit phone number.'),
  email: z.string().transform(normalizeEmail).pipe(z.string().email()),
  active: z.boolean().default(true),
  schedule: z.array(z.object({ day: z.enum(weekDays), beatId: z.string().min(1) })).min(6).max(7)
}).superRefine((data, context) => {
  const days = data.schedule.map(entry => entry.day);
  if (new Set(days).size !== days.length) context.addIssue({ code: 'custom', path: ['schedule'], message: 'Only one beat can be assigned per day.' });
  for (const day of requiredDays) if (!days.includes(day)) context.addIssue({ code: 'custom', path: ['schedule'], message: `Select a beat for ${day}.` });
});
