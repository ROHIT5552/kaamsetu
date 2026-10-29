import { Router, Request, Response, NextFunction } from 'express';
import { workerService } from '../services/worker.service.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);
router.use(requireRole(Role.ADMIN));

router.get('/workers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isPending = req.query.pending === '1';
    let workers;
    if (isPending) {
      workers = await workerService.listPendingWorkers();
    } else {
      const result = await workerService.queryWorkers({ page: 1, limit: 100 }, true);
      workers = result.workers;
    }

    res.json({
      success: true,
      workers,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/workers/:id/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await workerService.verifyWorker(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export const adminRouter = router;
