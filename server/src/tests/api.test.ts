import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { prisma } from '../prisma.js';

describe('Server API Endpoints Integration Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/health returns 200 and healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /api/stats returns marketplace statistics', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.workers).toBeGreaterThanOrEqual(0);
    expect(res.body.stats.averageRating).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/workers returns public worker list omitting phone numbers for guests', async () => {
    const res = await request(app).get('/api/workers?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.workers)).toBe(true);

    if (res.body.workers.length > 0) {
      const firstWorker = res.body.workers[0];
      // Guest should NOT see phone number
      expect(firstWorker.phone).toBeNull();
      expect(firstWorker.contactRevealed).toBe(false);
    }
  });

  it('POST /api/auth/otp/request and verify flow', async () => {
    const testPhone = '9876543219';

    // 1. Request OTP
    const reqRes = await request(app)
      .post('/api/auth/otp/request')
      .send({ target: testPhone });

    expect(reqRes.status).toBe(200);
    expect(reqRes.body.success).toBe(true);

    // 2. In dev/test, bypass code is 000000
    const verifyRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({
        target: testPhone,
        code: '000000',
        name: 'Test Customer',
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.accessToken).toBeDefined();
    expect(verifyRes.body.user).toBeDefined();
    expect(verifyRes.body.user.phone).toBe(testPhone);
  });
});
