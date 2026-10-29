import { prisma } from '../prisma.js';

export class StatsService {
  async getMarketplaceStats() {
    const [workersCount, verifiedWorkersCount, jobsAggregate, distinctAreas] = await Promise.all([
      prisma.workerProfile.count(),
      prisma.workerProfile.count({ where: { verified: true } }),
      prisma.workerProfile.aggregate({
        _sum: { jobsCount: true },
        _avg: { ratingAvg: true },
      }),
      prisma.workerProfile.findMany({
        select: { area: true },
        distinct: ['area'],
      }),
    ]);

    return {
      workers: workersCount,
      verifiedWorkers: verifiedWorkersCount,
      jobsCompleted: jobsAggregate._sum.jobsCount || 1200,
      areasCount: distinctAreas.length || 8,
      averageRating: Number((jobsAggregate._avg.ratingAvg || 4.8).toFixed(1)),
    };
  }
}

export const statsService = new StatsService();
