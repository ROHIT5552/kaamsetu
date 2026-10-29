import { Router, Request, Response, NextFunction } from 'express';
import { bookingService } from '../services/booking.service.js';
import {
  BookingCreateSchema,
  BookingStatusUpdateSchema,
  WorkerLocationUpdateSchema,
} from '@kaamsetu/shared';
import { requireAuth } from '../middleware/auth.middleware.js';
import { prisma } from '../prisma.js';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = BookingCreateSchema.parse({
      ...req.body,
      slot: Number(req.body.slot),
    });
    const result = await bookingService.createBooking(input, req.user?.id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/mine', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookings = await bookingService.getMyBookings(req.user!.id, req.user!.role);
    res.json({
      success: true,
      bookings,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const input = BookingStatusUpdateSchema.parse(req.body);

    const updated = await bookingService.updateBookingStatus(
      id,
      input.status,
      req.user!.id,
      req.user!.role
    );

    res.json({
      success: true,
      message: `Booking status updated to ${updated.status}`,
      booking: updated,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/location', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const input = WorkerLocationUpdateSchema.parse({
      lat: Number(req.body.lat),
      lng: Number(req.body.lng),
    });

    const location = await bookingService.updateWorkerLocation(id, input);

    res.json({
      success: true,
      location,
    });
  } catch (err) {
    next(err);
  }
});

// SSE endpoint for live tracking over Server-Sent Events
router.get('/:id/track', async (req: Request, res: Response) => {
  const { id } = req.params;

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering (for Render/Nginx)
  res.flushHeaders();

  // Send initial booking and location snapshot
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      location: true,
      worker: {
        include: {
          user: { select: { name: true, phone: true } },
        },
      },
    },
  });

  if (booking) {
    const initialPayload = {
      bookingId: booking.id,
      status: booking.status,
      workerName: booking.worker.user.name,
      workerPhone: req.user ? booking.worker.user.phone : null,
      area: booking.worker.area,
      job: booking.job,
      lat: booking.location?.lat || booking.lat,
      lng: booking.location?.lng || booking.lng,
      updatedAt: booking.location?.updatedAt || booking.updatedAt,
    };
    res.write(`data: ${JSON.stringify(initialPayload)}\n\n`);
  }

  // Register client for live broadcasts
  bookingService.registerTrackingClient(id, res);

  // Keep-alive heartbeat ping every 15 seconds
  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    bookingService.unregisterTrackingClient(id, res);
  });
});

export const bookingRouter = router;
