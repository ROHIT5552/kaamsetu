import { describe, it, expect } from 'vitest';
import {
  OtpRequestSchema,
  OtpVerifySchema,
  WorkerCreateSchema,
  WorkerQuerySchema,
  BookingCreateSchema,
  INDIAN_PHONE_REGEX,
} from '@kaamsetu/shared';

describe('Shared Zod Schemas & Validators', () => {
  it('validates 10-digit Indian phone numbers', () => {
    expect(INDIAN_PHONE_REGEX.test('9876543210')).toBe(true);
    expect(INDIAN_PHONE_REGEX.test('7875453977')).toBe(true);
    expect(INDIAN_PHONE_REGEX.test('6234567890')).toBe(true);

    // Invalid numbers
    expect(INDIAN_PHONE_REGEX.test('1234567890')).toBe(false); // starts with 1
    expect(INDIAN_PHONE_REGEX.test('987654321')).toBe(false); // 9 digits
    expect(INDIAN_PHONE_REGEX.test('98765432100')).toBe(false); // 11 digits
  });

  it('validates OTP request schema', () => {
    // Valid phone
    const res1 = OtpRequestSchema.safeParse({ target: '9876543210' });
    expect(res1.success).toBe(true);

    // Valid email
    const res2 = OtpRequestSchema.safeParse({ target: 'user@example.com' });
    expect(res2.success).toBe(true);

    // Invalid target
    const res3 = OtpRequestSchema.safeParse({ target: 'invalid' });
    expect(res3.success).toBe(false);
  });

  it('validates OTP verify schema', () => {
    const valid = OtpVerifySchema.safeParse({
      target: '9876543210',
      code: '123456',
    });
    expect(valid.success).toBe(true);

    const invalidCode = OtpVerifySchema.safeParse({
      target: '9876543210',
      code: '12345', // only 5 digits
    });
    expect(invalidCode.success).toBe(false);
  });

  it('validates Worker creation schema', () => {
    const validWorker = WorkerCreateSchema.safeParse({
      name: 'Ramesh Pawar',
      skill: 'plumber',
      yearsExp: 10,
      area: 'Garkheda',
      ratePerDay: 700,
      visitCharge: 100,
      phone: '9876543210',
      about: 'Quality plumbing repairs',
    });
    expect(validWorker.success).toBe(true);

    const invalidRate = WorkerCreateSchema.safeParse({
      name: 'Ramesh Pawar',
      skill: 'plumber',
      yearsExp: 10,
      area: 'Garkheda',
      ratePerDay: 50, // minimum ₹100
      phone: '9876543210',
    });
    expect(invalidRate.success).toBe(false);
  });

  it('validates Booking creation schema', () => {
    const validBooking = BookingCreateSchema.safeParse({
      workerId: '123e4567-e89b-12d3-a456-426614174000',
      date: '2026-10-30',
      slot: 1,
      job: 'Fix pipe leakage in bathroom',
      name: 'Anand Kulkarni',
      phone: '9876543210',
      address: 'Garkheda',
    });
    expect(validBooking.success).toBe(true);
  });
});
