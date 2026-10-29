import { prisma } from '../prisma.js';
import {
  WorkerQueryInput,
  WorkerCreateInput,
  WorkerUpdateInput,
  SkillType,
  AvailabilityType,
} from '@kaamsetu/shared';
import { storageProvider } from '../providers/storage.provider.js';
import { Role, Skill, Availability } from '@prisma/client';

export class WorkerService {
  async queryWorkers(query: WorkerQueryInput, isAuthenticated: boolean) {
    const { skill, area, avail, maxRate, q, sort, page = 1, limit = 20 } = query;

    const where: any = {};

    if (skill && skill !== 'all') {
      where.skill = skill as Skill;
    }

    if (area) {
      where.area = area;
    }

    if (avail && avail !== 'any') {
      if (avail === 'today') {
        where.availability = Availability.today;
      } else if (avail === 'tomorrow') {
        where.availability = { in: [Availability.today, Availability.tomorrow] };
      }
      // if 'week', any worker is acceptable
    }

    if (maxRate && maxRate > 0) {
      where.ratePerDay = { lte: maxRate };
    }

    if (q && q.trim()) {
      const term = q.trim();
      where.OR = [
        { user: { name: { contains: term, mode: 'insensitive' } } },
        { about: { contains: term, mode: 'insensitive' } },
        { area: { contains: term, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = { ratingAvg: 'desc' };
    if (sort === 'low') {
      orderBy = { ratePerDay: 'asc' };
    } else if (sort === 'exp') {
      orderBy = { yearsExp: 'desc' };
    }

    const skip = (page - 1) * limit;

    const [total, workers] = await Promise.all([
      prisma.workerProfile.count({ where }),
      prisma.workerProfile.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          photos: {
            orderBy: { order: 'asc' },
            take: 3,
          },
          reviews: {
            take: 2,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    // Privacy rule: Only reveal phone numbers to authenticated users
    const sanitizedWorkers = workers.map((w) => ({
      id: w.id,
      userId: w.userId,
      name: w.user.name,
      skill: w.skill,
      yearsExp: w.yearsExp,
      area: w.area,
      ratePerDay: w.ratePerDay,
      visitCharge: w.visitCharge,
      about: w.about,
      availability: w.availability,
      verified: w.verified,
      ratingAvg: w.ratingAvg,
      jobsCount: w.jobsCount,
      phone: isAuthenticated ? w.user.phone : null,
      contactRevealed: isAuthenticated,
      photos: w.photos.map((p) => p.url),
      reviews: w.reviews.map((r) => r.text),
    }));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      workers: sanitizedWorkers,
    };
  }

  async getWorkerById(id: string, isAuthenticated: boolean) {
    const worker = await prisma.workerProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        photos: {
          orderBy: { order: 'asc' },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!worker) {
      const err: any = new Error('Worker profile not found');
      err.statusCode = 404;
      throw err;
    }

    return {
      id: worker.id,
      userId: worker.userId,
      name: worker.user.name,
      skill: worker.skill,
      yearsExp: worker.yearsExp,
      area: worker.area,
      ratePerDay: worker.ratePerDay,
      visitCharge: worker.visitCharge,
      about: worker.about,
      availability: worker.availability,
      verified: worker.verified,
      ratingAvg: worker.ratingAvg,
      jobsCount: worker.jobsCount,
      phone: isAuthenticated ? worker.user.phone : null,
      contactRevealed: isAuthenticated,
      photos: worker.photos.map((p) => p.url),
      reviews: worker.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        text: r.text,
        customerName: r.customer.name,
        createdAt: r.createdAt,
      })),
    };
  }

  async createWorkerProfile(userId: string, input: WorkerCreateInput, files?: Express.Multer.File[]) {
    // 1. Update user info & role to WORKER
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        phone: input.phone,
        role: Role.WORKER,
      },
    });

    // 2. Upload any files if provided
    const photoUrls: string[] = input.photos || [];
    if (files && files.length > 0) {
      for (const file of files) {
        const url = await storageProvider.uploadImage(file.buffer, file.mimetype);
        photoUrls.push(url);
      }
    }

    // 3. Upsert worker profile marked verified: false (pending verification)
    const profile = await prisma.workerProfile.upsert({
      where: { userId },
      update: {
        skill: input.skill as Skill,
        yearsExp: input.yearsExp,
        area: input.area,
        ratePerDay: input.ratePerDay,
        visitCharge: input.visitCharge,
        about: input.about,
        verified: false, // New worker signup creates with verified=false
      },
      create: {
        userId,
        skill: input.skill as Skill,
        yearsExp: input.yearsExp,
        area: input.area,
        ratePerDay: input.ratePerDay,
        visitCharge: input.visitCharge,
        about: input.about,
        verified: false,
      },
    });

    // Save photos
    if (photoUrls.length > 0) {
      await prisma.workPhoto.deleteMany({ where: { workerId: profile.id } });
      await prisma.workPhoto.createMany({
        data: photoUrls.map((url, index) => ({
          workerId: profile.id,
          url,
          order: index,
        })),
      });
    }

    return {
      success: true,
      message: 'Worker profile submitted successfully. Status: Pending Verification.',
      profile,
    };
  }

  async updateWorkerProfile(workerId: string, input: WorkerUpdateInput, currentUserId: string, isAdmin: boolean) {
    const worker = await prisma.workerProfile.findUnique({
      where: { id: workerId },
    });

    if (!worker) {
      const err: any = new Error('Worker profile not found');
      err.statusCode = 404;
      throw err;
    }

    // Only owner or admin can update
    if (worker.userId !== currentUserId && !isAdmin) {
      const err: any = new Error('Forbidden: You can only update your own profile');
      err.statusCode = 403;
      throw err;
    }

    const dataToUpdate: any = {};
    if (input.ratePerDay !== undefined) dataToUpdate.ratePerDay = input.ratePerDay;
    if (input.visitCharge !== undefined) dataToUpdate.visitCharge = input.visitCharge;
    if (input.about !== undefined) dataToUpdate.about = input.about;
    if (input.area !== undefined) dataToUpdate.area = input.area;
    if (input.yearsExp !== undefined) dataToUpdate.yearsExp = input.yearsExp;
    if (input.availability !== undefined) dataToUpdate.availability = input.availability as Availability;
    if (input.verified !== undefined && isAdmin) dataToUpdate.verified = input.verified;

    const updated = await prisma.workerProfile.update({
      where: { id: workerId },
      data: dataToUpdate,
    });

    return updated;
  }

  async verifyWorker(workerId: string) {
    const worker = await prisma.workerProfile.findUnique({
      where: { id: workerId },
      include: { user: true },
    });

    if (!worker) {
      const err: any = new Error('Worker profile not found');
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.workerProfile.update({
      where: { id: workerId },
      data: {
        verified: true,
      },
      include: { user: true },
    });

    return {
      success: true,
      message: `Worker ${worker.user.name} verified successfully.`,
      worker: updated,
    };
  }

  async listPendingWorkers() {
    return prisma.workerProfile.findMany({
      where: { verified: false },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        photos: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const workerService = new WorkerService();
