import { z } from 'zod';
import { INDIAN_PHONE_REGEX } from './auth';

export const BookingStatusEnum = z.enum([
  'PENDING',
  'CONFIRMED',
  'ON_THE_WAY',
  'ARRIVED',
  'DONE',
  'CANCELLED'
]);

export type BookingStatusType = z.infer<typeof BookingStatusEnum>;

export const BookingCreateSchema = z.object({
  workerId: z.string().uuid().or(z.coerce.number().int()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  slot: z.coerce.number().int().min(0).max(2),
  job: z.string().trim().min(3, 'Job description must be at least 3 characters').max(500),
  name: z.string().trim().min(2, 'Name is required').max(100),
  phone: z.string().trim().regex(INDIAN_PHONE_REGEX, 'Enter a valid 10-digit mobile number'),
  address: z.string().trim().min(3, 'Address is required').max(300).optional(),
});

export type BookingCreateInput = z.infer<typeof BookingCreateSchema>;

export const BookingStatusUpdateSchema = z.object({
  status: BookingStatusEnum,
});

export type BookingStatusUpdateInput = z.infer<typeof BookingStatusUpdateSchema>;

export const WorkerLocationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type WorkerLocationUpdateInput = z.infer<typeof WorkerLocationUpdateSchema>;
