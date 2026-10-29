import { Router, Request, Response, NextFunction } from 'express';
import { statsService } from '../services/stats.service.js';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await statsService.getMarketplaceStats();
    res.json({
      success: true,
      stats,
    });
  } catch (err) {
    next(err);
  }
});

export const statsRouter = router;
