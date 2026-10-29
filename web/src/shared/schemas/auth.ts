import { z } from 'zod';

export const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

export const OtpRequestSchema = z.object({
  target: z.string().trim().refine((val) => {
    return INDIAN_PHONE_REGEX.test(val) || z.string().email().safeParse(val).success;
  }, {
    message: 'Must be a valid 10-digit Indian mobile number or valid email address',
  }),
  type: z.enum(['PHONE', 'EMAIL']).optional(),
  purpose: z.enum(['LOGIN', 'SIGNUP', 'VERIFY']).default('LOGIN'),
});

export type OtpRequestInput = z.infer<typeof OtpRequestSchema>;

export const OtpVerifySchema = z.object({
  target: z.string().trim().refine((val) => {
    return INDIAN_PHONE_REGEX.test(val) || z.string().email().safeParse(val).success;
  }, {
    message: 'Must be a valid 10-digit Indian mobile number or valid email address',
  }),
  code: z.string().trim().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must contain numbers only'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80).optional(),
  role: z.enum(['CUSTOMER', 'WORKER']).default('CUSTOMER'),
});

export type OtpVerifyInput = z.infer<typeof OtpVerifySchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
