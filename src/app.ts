import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import { NotFoundError } from './utils/ApiError';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middlewares/errorHandler.middleware';
import studentRoutes from "./routes/student.routes";
import adminRoutes from "./routes/admin.routes";
import superadminRoutes from './routes/superadmin.routes';
import publicRoutes from './routes/public.routes';
import userRoutes from './routes/user.routes';
import { startSyncJob } from './jobs/sync.job';

dotenv.config();

const app = express();

// Middlewares
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use("/api/students", studentRoutes);
app.use('/api/user', userRoutes);
app.use('/api', publicRoutes);                     // Public routes (cities, batches)
app.use('/api/admin', adminRoutes);              // Teacher & Intern & admin
app.use('/api/superadmin',superadminRoutes);    // Superadmin ONLY

// Serve static files for CSV UI
app.use('/csv-ui', express.static(path.join(__dirname, 'csv_ui')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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