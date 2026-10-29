import { z } from 'zod';

export const ReviewCreateSchema = z.object({
  workerId: z.string().uuid().or(z.coerce.number().int()),
  bookingId: z.string().uuid().optional(),
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(3, 'Review text must be at least 3 characters').max(1000),
});

export type ReviewCreateInput = z.infer<typeof ReviewCreateSchema>;
