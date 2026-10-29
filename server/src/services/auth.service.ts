import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { config } from '../config/index.js';
import { smsProvider } from '../providers/sms.provider.js';
import { emailProvider } from '../providers/email.provider.js';
import { INDIAN_PHONE_REGEX, OtpRequestInput, OtpVerifyInput } from '@kaamsetu/shared';
import { Role } from '@prisma/client';

export class AuthService {
  private hashOtp(code: string): string {
    return crypto
      .createHash('sha256')
      .update(code + config.JWT_ACCESS_SECRET)
      .digest('hex');
  }

  private isPhone(target: string): boolean {
    return INDIAN_PHONE_REGEX.test(target);
  }

  async requestOtp(input: OtpRequestInput) {
    const target = input.target.trim();
    const isPhone = this.isPhone(target);
    const otpType = isPhone ? 'PHONE' : 'EMAIL';

    // 1. Check 30s resend cooldown
    const latestOtp = await prisma.otpCode.findFirst({
      where: { target, purpose: input.purpose },
      orderBy: { createdAt: 'desc' },
    });

    if (latestOtp) {
      const secondsSinceLast = (Date.now() - latestOtp.createdAt.getTime()) / 1000;
      if (secondsSinceLast < 30) {
        const waitSeconds = Math.ceil(30 - secondsSinceLast);
        const err: any = new Error(`Please wait ${waitSeconds} seconds before requesting a new OTP.`);
        err.statusCode = 429;
        throw err;
      }
    }

    // 2. Generate cryptographically strong 6-digit OTP
    const rawCode = Math.floor(100000 + crypto.randomInt(900000)).toString();
    const codeHash = this.hashOtp(rawCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    await prisma.otpCode.create({
      data: {
        target,
        type: otpType,
        codeHash,
        purpose: input.purpose,
        expiresAt,
      },
    });

    // 3. Dispatch via appropriate provider
    if (isPhone) {
      await smsProvider.sendOtp(target, rawCode);
    } else {
      await emailProvider.sendOtp(target, rawCode);
    }

    return {
      success: true,
      message: `OTP sent successfully to ${isPhone ? '+91-' + target : target}`,
      cooldownSeconds: 30,
      // For automated tests and dev demo convenience:
      debugCode: config.NODE_ENV !== 'production' ? rawCode : undefined,
    };
  }

  async verifyOtp(input: OtpVerifyInput, userAgent?: string, ipAddress?: string) {
    const target = input.target.trim();
    const isPhone = this.isPhone(target);

    // 1. Find the latest valid OTP for this target
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        target,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      const err: any = new Error('No active OTP found. Please request a new code.');
      err.statusCode = 400;
      throw err;
    }

    // 2. Check maximum 5 attempts rule
    if (otpRecord.attempts >= 5) {
      const err: any = new Error('Maximum verification attempts exceeded. Please request a new OTP.');
      err.statusCode = 429;
      throw err;
    }

    // 3. Check expiration (10 mins)
    if (otpRecord.expiresAt < new Date()) {
      const err: any = new Error('OTP has expired. Please request a new code.');
      err.statusCode = 400;
      throw err;
    }

    // 4. Validate code hash or dev bypass
    const providedHash = this.hashOtp(input.code);
    const isBypass =
      config.NODE_ENV !== 'production' &&
      config.DEV_OTP_BYPASS &&
      input.code === config.DEV_OTP_BYPASS;

    if (providedHash !== otpRecord.codeHash && !isBypass) {
      // Increment attempts counter
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = 4 - otpRecord.attempts;
      const err: any = new Error(`Invalid OTP code. ${remaining > 0 ? remaining + ' attempts remaining.' : 'Please request a new OTP.'}`);
      err.statusCode = 400;
      throw err;
    }

    // Mark OTP consumed
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { consumedAt: new Date() },
    });

    // 5. Find or create user
    // Check if target is admin
    const isAdmin =
      (isPhone && config.ADMIN_PHONE && target === config.ADMIN_PHONE) ||
      (!isPhone && config.ADMIN_EMAIL && target.toLowerCase() === config.ADMIN_EMAIL.toLowerCase());

    const desiredRole = isAdmin ? Role.ADMIN : (input.role as Role) || Role.CUSTOMER;

    let user = await prisma.user.findFirst({
      where: isPhone ? { phone: target } : { email: target },
      include: { workerProfile: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: input.name || (isAdmin ? 'System Admin' : isPhone ? `User-${target.slice(-4)}` : target.split('@')[0]),
          phone: isPhone ? target : null,
          email: !isPhone ? target : null,
          phoneVerifiedAt: isPhone ? new Date() : null,
          emailVerifiedAt: !isPhone ? new Date() : null,
          role: desiredRole,
        },
        include: { workerProfile: true },
      });
    } else {
      // Update verification timestamp and role if needed
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          phoneVerifiedAt: isPhone ? new Date() : user.phoneVerifiedAt,
          emailVerifiedAt: !isPhone ? new Date() : user.emailVerifiedAt,
          role: isAdmin ? Role.ADMIN : user.role,
        },
        include: { workerProfile: true },
      });
    }

    // 6. Create active Session
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
        expiresAt: sessionExpiresAt,
      },
    });

    // 7. Issue short-lived access JWT (15 mins)
    const accessToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        sessionId: session.id,
      },
      config.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        email: user.email,
        workerProfile: user.workerProfile,
      },
      accessToken,
      refreshToken,
      sessionExpiresAt,
    };
  }

  async refreshTokens(oldRefreshToken: string, userAgent?: string, ipAddress?: string) {
    if (!oldRefreshToken) {
      const err: any = new Error('Refresh token is required');
      err.statusCode = 401;
      throw err;
    }

    const oldHash = crypto.createHash('sha256').update(oldRefreshToken).digest('hex');

    const session = await prisma.session.findUnique({
      where: { tokenHash: oldHash },
      include: { user: { include: { workerProfile: true } } },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      const err: any = new Error('Session has expired or was revoked. Please log in again.');
      err.statusCode = 401;
      throw err;
    }

    // Rotate refresh token
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newRefreshHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        tokenHash: newRefreshHash,
        expiresAt: newExpiresAt,
        userAgent: userAgent || session.userAgent,
        ipAddress: ipAddress || session.ipAddress,
      },
    });

    const accessToken = jwt.sign(
      {
        userId: session.user.id,
        role: session.user.role,
        sessionId: session.id,
      },
      config.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: session.user.id,
        name: session.user.name,
        role: session.user.role,
        phone: session.user.phone,
        email: session.user.email,
        workerProfile: session.user.workerProfile,
      },
    };
  }

  async logout(sessionId: string) {
    if (sessionId) {
      await prisma.session.updateMany({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true, message: 'Logged out successfully' };
  }
}

export const authService = new AuthService();
