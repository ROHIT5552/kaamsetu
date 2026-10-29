import { Router, Request, Response, NextFunction } from 'express';
import { reviewService } from '../services/review.service.js';
import { ReviewCreateSchema } from '@kaamsetu/shared';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = ReviewCreateSchema.parse({
      ...req.body,
      rating: Number(req.body.rating),
    });
    const review = await reviewService.createReview(req.user!.id, input);
    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review,
    });
  } catch (err) {
    next(err);
  }
});

export const reviewRouter = router;
