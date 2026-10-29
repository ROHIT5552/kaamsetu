import { prisma } from '../prisma.js';
import {
  BookingCreateInput,
  BookingStatusType,
  WorkerLocationUpdateInput,
  AURANGABAD_COORDS,
} from '@kaamsetu/shared';
import { BookingStatus, Role } from '@prisma/client';
import { Response } from 'express';

// Active SSE client subscriptions for booking tracking
const trackingClients: Map<string, Set<Response>> = new Map();

export class BookingService {
  async createBooking(input: BookingCreateInput, currentUserId?: string) {
    // 1. Resolve customer user
    let customerId = currentUserId;

    if (!customerId) {
      // Find or create customer by phone
      let customer = await prisma.user.findUnique({
        where: { phone: input.phone },
      });

      if (!customer) {
        customer = await prisma.user.create({
          data: {
            name: input.name,
            phone: input.phone,
            role: Role.CUSTOMER,
            phoneVerifiedAt: new Date(),
          },
        });
      }
      customerId = customer.id;
    }

    // 2. Resolve worker profile
    let workerProfileId = String(input.workerId);
    // If workerId is a number (e.g. from prototype 1..12), find worker by phone pattern
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
      include: { user: true },
    });

    if (!worker) {
      const err: any = new Error('Worker not found');
      err.statusCode = 404;
      throw err;
    }

    // 3. Double-booking check: verify worker does not already have an active booking on same date and slot
    const bookingDate = new Date(`${input.date}T00:00:00.000Z`);

    const existingBooking = await prisma.booking.findFirst({
      where: {
        workerId: worker.id,
        date: bookingDate,
        slot: input.slot,
        status: { notIn: [BookingStatus.CANCELLED] },
      },
    });

    if (existingBooking) {
      const err: any = new Error(
        `This worker is already booked for this date and time slot. Please choose another time slot or date.`
      );
      err.statusCode = 409;
      throw err;
    }

    // 4. Create booking
    const defaultCoords =
      AURANGABAD_COORDS.areas[worker.area] || AURANGABAD_COORDS.center;

    const booking = await prisma.booking.create({
      data: {
        workerId: worker.id,
        customerId: customerId!,
        date: bookingDate,
        slot: input.slot,
        job: input.job,
        address: input.address || worker.area,
        status: BookingStatus.CONFIRMED,
        lat: defaultCoords.lat,
        lng: defaultCoords.lng,
        location: {
          create: {
            lat: defaultCoords.lat,
            lng: defaultCoords.lng,
          },
        },
      },
      include: {
        worker: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
        location: true,
      },
    });

    return {
      success: true,
      message: 'Booking request sent successfully. Worker will contact you soon.',
      booking,
    };
  }

  async getMyBookings(userId: string, role: Role) {
    if (role === Role.WORKER) {
      const profile = await prisma.workerProfile.findUnique({
        where: { userId },
      });
      if (!profile) return [];

      return prisma.booking.findMany({
        where: { workerId: profile.id },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          location: true,
        },
        orderBy: { date: 'desc' },
      });
    }

    // Customer bookings
    return prisma.booking.findMany({
      where: { customerId: userId },
      include: {
        worker: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
          },
        },
        location: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async updateBookingStatus(
    bookingId: string,
    status: BookingStatusType,
    userId: string,
    userRole: Role
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { worker: true },
    });

    if (!booking) {
      const err: any = new Error('Booking not found');
      err.statusCode = 404;
      throw err;
    }

    // Authorization checks
    if (userRole === Role.CUSTOMER) {
      if (booking.customerId !== userId) {
        const err: any = new Error('Forbidden: You can only update your own bookings');
        err.statusCode = 403;
        throw err;
      }
      if (status !== 'CANCELLED') {
        const err: any = new Error('Customers can only cancel bookings');
        err.statusCode = 400;
        throw err;
      }
    } else if (userRole === Role.WORKER) {
      if (booking.worker.userId !== userId) {
        const err: any = new Error('Forbidden: You can only update bookings assigned to you');
        err.statusCode = 403;
        throw err;
      }
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: status as BookingStatus },
    });

    // Notify any active tracking SSE listeners
    this.broadcastTrackingUpdate(bookingId, {
      status: updated.status,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  async updateWorkerLocation(bookingId: string, input: WorkerLocationUpdateInput) {
    const location = await prisma.workerLocation.upsert({
      where: { bookingId },
      update: {
        lat: input.lat,
        lng: input.lng,
      },
      create: {
        bookingId,
        lat: input.lat,
        lng: input.lng,
      },
    });

    // Broadcast to tracking SSE clients
    this.broadcastTrackingUpdate(bookingId, {
      lat: location.lat,
      lng: location.lng,
      updatedAt: location.updatedAt.toISOString(),
    });

    return location;
  }

  registerTrackingClient(bookingId: string, res: Response) {
    if (!trackingClients.has(bookingId)) {
      trackingClients.set(bookingId, new Set());
    }
    trackingClients.get(bookingId)!.add(res);
  }

  unregisterTrackingClient(bookingId: string, res: Response) {
    const clients = trackingClients.get(bookingId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        trackingClients.delete(bookingId);
      }
    }
  }

  private broadcastTrackingUpdate(bookingId: string, data: any) {
    const clients = trackingClients.get(bookingId);
    if (!clients || clients.size === 0) return;

    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) {
      client.write(payload);
    }
  }
}

export const bookingService = new BookingService();
