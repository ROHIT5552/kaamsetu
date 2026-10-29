import { z } from 'zod';
import { INDIAN_PHONE_REGEX } from './auth.js';

export const SkillEnum = z.enum(['plumber', 'electrician', 'carpenter', 'painter', 'mason', 'helper']);
export type SkillType = z.infer<typeof SkillEnum>;

export const AvailabilityEnum = z.enum(['today', 'tomorrow', 'week']);
export type AvailabilityType = z.infer<typeof AvailabilityEnum>;

export const SortEnum = z.enum(['rt', 'low', 'exp']).default('rt');
export type SortType = z.infer<typeof SortEnum>;

export const WorkerQuerySchema = z.object({
  skill: z.string().optional(),
  area: z.string().optional(),
  avail: z.string().optional(),
  maxRate: z.coerce.number().min(0).optional(),
  q: z.string().optional(),
  sort: SortEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type WorkerQueryInput = z.infer<typeof WorkerQuerySchema>;

export const WorkerCreateSchema = z.object({
  name: z.string().trim().min(2, 'Full name is required').max(100),
  skill: SkillEnum,
  yearsExp: z.coerce.number().int().min(0, 'Years of experience cannot be negative').max(60),
  area: z.string().trim().min(2, 'Area is required'),
  ratePerDay: z.coerce.number().int().min(100, 'Minimum rate per day is ₹100').max(10000),
  visitCharge: z.coerce.number().int().min(0).default(0),
  phone: z.string().trim().regex(INDIAN_PHONE_REGEX, 'Enter a valid 10-digit Indian mobile number'),
  about: z.string().trim().min(5, 'Description must be at least 5 characters').max(1000).default('New on KaamSetu. Verification pending.'),
  photos: z.array(z.string().url()).max(6).optional(),
});

export type WorkerCreateInput = z.infer<typeof WorkerCreateSchema>;

export const WorkerUpdateSchema = z.object({
  ratePerDay: z.coerce.number().int().min(100).max(10000).optional(),
  visitCharge: z.coerce.number().int().min(0).optional(),
  about: z.string().trim().min(5).max(1000).optional(),
  area: z.string().trim().min(2).optional(),
  yearsExp: z.coerce.number().int().min(0).max(60).optional(),
  availability: AvailabilityEnum.optional(),
  verified: z.boolean().optional(),
});

export type WorkerUpdateInput = z.infer<typeof WorkerUpdateSchema>;
