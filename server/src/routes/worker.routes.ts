import { Router, Request, Response, NextFunction } from 'express';
import { workerService } from '../services/worker.service.js';
import { WorkerQuerySchema, WorkerCreateSchema, WorkerUpdateSchema } from '@kaamsetu/shared';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadPhotos } from '../middleware/upload.middleware.js';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = WorkerQuerySchema.parse(req.query);
    const isAuthenticated = !!req.user;
    const result = await workerService.queryWorkers(query, isAuthenticated);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const isAuthenticated = !!req.user;
    const worker = await workerService.getWorkerById(id, isAuthenticated);
    res.json({
      success: true,
      worker,
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requireAuth,
  uploadPhotos.array('photos', 6),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse body (multipart form fields are strings, coerce them)
      const input = WorkerCreateSchema.parse({
        ...req.body,
        yearsExp: Number(req.body.yearsExp),
        ratePerDay: Number(req.body.ratePerDay),
        visitCharge: Number(req.body.visitCharge || 0),
        photos: req.body.photos ? (Array.isArray(req.body.photos) ? req.body.photos : [req.body.photos]) : undefined,
      });

      const files = req.files as Express.Multer.File[] | undefined;
      const result = await workerService.createWorkerProfile(req.user!.id, input, files);

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const input = WorkerUpdateSchema.parse(req.body);
    const isAdmin = req.user!.role === 'ADMIN';

    const updated = await workerService.updateWorkerProfile(id, input, req.user!.id, isAdmin);

    res.json({
      success: true,
      message: 'Worker profile updated successfully',
      worker: updated,
    });
  } catch (err) {
    next(err);
  }
});

export const workerRouter = router;
