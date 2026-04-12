import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { NotFoundError } from './utils/ApiError';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middlewares/errorHandler.middleware';
import studentRoutes from "./routes/student.routes";
import adminRoutes from "./routes/admin.routes";
import superadminRoutes from './routes/superadmin.routes';
import publicRoutes from './routes/public.routes';
import userRoutes from './routes/user.routes';
import { startSyncJob } from './jobs/sync.job';
import { apiLimiter } from './middlewares/rateLimiter';
import './workers/studentSync.worker'; // Initialize BullMQ worker
import './queues/studentSync.events'; // Initialize QueueEvents

dotenv.config();

const app = express();

// Middlewares
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Apply global API rate limiter to all API routes
// Note: Specific routes with their own limiters will override this
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use("/api/students", studentRoutes);
app.use('/api/user', userRoutes);
app.use('/api', publicRoutes);                     // Public routes (cities, batches)
app.use('/api/admin', adminRoutes);              // Teacher & Intern & admin
app.use('/api/superadmin',superadminRoutes);    // Superadmin ONLY

// CSV UI directory removed - was referencing non-existent directory

// Health check with DB and Redis connectivity
app.get('/health', async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'OK',
    checks: {
      database: 'unknown',
      redis: 'unknown'
    }
  };

  try {
    // Check database connectivity
    const prisma = require('./config/prisma').default;
    await prisma.$queryRaw`SELECT 1`;
    healthcheck.checks.database = 'healthy';
  } catch (error) {
    healthcheck.status = 'ERROR';
    healthcheck.checks.database = 'unhealthy';
  }

  try {
    // Check Redis connectivity
    const redisConnection = require('./config/redis').redisConnection;
    await redisConnection.ping();
    healthcheck.checks.redis = 'healthy';
  } catch (error) {
    healthcheck.status = 'ERROR';
    healthcheck.checks.redis = 'unhealthy';
  }

  const statusCode = healthcheck.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(healthcheck);
});

// 404 Fallback for unknown routes
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize cron jobs for leaderboard optimization
startSyncJob();

export default app;