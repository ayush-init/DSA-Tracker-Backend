import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middlewares/errorHandler.middleware';
import studentRoutes from "./routes/student.routes";
import adminRoutes from "./routes/admin.routes";
import superadminRoutes from './routes/superadmin.routes';
import { startSyncJob } from './jobs/sync.job';
import s3Routes from './routes/s3.routes';
dotenv.config();

// Swagger UI Integration
// Load OpenAPI YAML specification
const openApiSpec = YAML.load(path.join(__dirname, '../docs/openapi.yaml'));

const app = express();

// Middlewares
app.use(cors({
  origin: ['http://localhost:5000', 'http://127.0.0.1:5500', 'http://localhost:5500', 'http://127.0.0.1:5501', 'http://localhost:5501'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// S3 Routes (for testing)
app.use('/api/s3', s3Routes);

// Routes
app.use('/api/auth', authRoutes);
app.use("/api/students", studentRoutes);
app.use('/api/admin', adminRoutes);              // Teacher & Intern & admin
app.use('/api/superadmin',superadminRoutes);    // Superadmin ONLY

// Swagger UI Documentation Route
// Developers can test all APIs interactively at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'DSA Tracker API Documentation'
}));

// Serve static files for CSV UI
app.use('/csv-ui', express.static(path.join(__dirname, 'csv_ui')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize cron jobs for leaderboard optimization
startSyncJob();

export default app;