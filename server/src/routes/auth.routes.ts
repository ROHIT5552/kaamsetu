import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { OtpRequestSchema, OtpVerifySchema, RefreshTokenSchema } from '@kaamsetu/shared';
import { otpLimiter } from '../middleware/rate-limiter.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { config } from '../config/index.js';

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  domain: config.COOKIE_DOMAIN || undefined,
};

router.post('/otp/request', otpLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = OtpRequestSchema.parse(req.body);
    const result = await authService.requestOtp(input);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/otp/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = OtpVerifySchema.parse(req.body);
    const userAgent = req.headers['user-agent'];
    const ip = req.ip || req.socket.remoteAddress;

    const result = await authService.verifyOtp(input, userAgent, ip);

    // Set secure httpOnly cookies
    res.cookie('accessToken', result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie('refreshToken', result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({
      success: true,
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    const userAgent = req.headers['user-agent'];
    const ip = req.ip || req.socket.remoteAddress;

    const result = await authService.refreshTokens(token, userAgent, ip);

    res.cookie('accessToken', result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.sessionId) {
      await authService.logout(req.user.sessionId);
    }

    res.clearCookie('accessToken', COOKIE_OPTIONS);
    res.clearCookie('refreshToken', COOKIE_OPTIONS);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    user: req.user,
  });
});

export const authRouter = router;
