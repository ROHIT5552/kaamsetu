import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { apiLimiter } from './middleware/rate-limiter.js';
import { authenticate } from './middleware/auth.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

import { authRouter } from './routes/auth.routes.js';
import { workerRouter } from './routes/worker.routes.js';
import { bookingRouter } from './routes/booking.routes.js';
import { reviewRouter } from './routes/review.routes.js';
import { statsRouter } from './routes/stats.routes.js';
import { adminRouter } from './routes/admin.routes.js';

const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow 3D canvas and SSE streaming
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration - strict origin with credentials
const allowedOrigins = [
  config.WEB_ORIGIN,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com')
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// Body parsers and cookie middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Trust proxy for Render / Vercel deployment
app.set('trust proxy', 1);

// Optional authentication parser for all requests
app.use(authenticate);

// Health check endpoint for Render monitoring
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
  });
});

// Apply API rate limiter to all /api routes
app.use('/api', apiLimiter);

// Mount API routers
app.use('/api/auth', authRouter);
app.use('/api/workers', workerRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/stats', statsRouter);
app.use('/api/admin', adminRouter);

// Global Error Handler
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 KaamSetu API Server running on port ${config.PORT}`);
    console.log(`📡 Environment: ${config.NODE_ENV}`);
    console.log(`🔗 Healthcheck: http://localhost:${config.PORT}/api/health`);
    console.log(`=================================================\n`);
  });
}

export default app;
