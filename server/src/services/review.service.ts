import { prisma } from '../prisma.js';
import { ReviewCreateInput } from '@kaamsetu/shared';
import { BookingStatus } from '@prisma/client';

export class ReviewService {
  async createReview(customerId: string, input: ReviewCreateInput) {
    let workerProfileId = String(input.workerId);

    // If workerId is numeric (1..12), map to profile
    if (!workerProfileId.includes('-')) {
      const fakePhone = `9000000${String(input.workerId).padStart(3, '0')}`;
      const workerUser = await prisma.user.findUnique({
        where: { phone: fakePhone },
        include: { workerProfile: true },
      });
      if (workerUser?.workerProfile) {
        workerProfileId = workerUser.workerProfile.id;
      }
    }

    const worker = await prisma.workerProfile.findUnique({
      where: { id: workerProfileId },
    });

    if (!worker) {
      const err: any = new Error('Worker profile not found');
      err.statusCode = 404;
      throw err;
    }

    // Check if review requires completed booking
    if (input.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: input.bookingId },
      });

      if (!booking || booking.status !== BookingStatus.DONE) {
        const err: any = new Error('Reviews can only be submitted after a booking is marked as DONE');
        err.statusCode = 400;
        throw err;
      }
    }

    // 1. Create review
    const review = await prisma.review.create({
      data: {
        workerId: worker.id,
        customerId,
        rating: input.rating,
        text: input.text,
      },
      include: {
        customer: { select: { name: true } },
      },
    });

    // 2. Recalculate average rating
    const aggregate = await prisma.review.aggregate({
      where: { workerId: worker.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.workerProfile.update({
      where: { id: worker.id },
      data: {
        ratingAvg: Number((aggregate._avg.rating || 4.5).toFixed(1)),
        jobsCount: { increment: 1 },
      },
    });

    return review;
  }
}

export const reviewService = new ReviewService();
