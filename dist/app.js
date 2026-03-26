"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const yamljs_1 = __importDefault(require("yamljs"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const errorHandler_middleware_1 = require("./middlewares/errorHandler.middleware");
const student_routes_1 = __importDefault(require("./routes/student.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const superadmin_routes_1 = __importDefault(require("./routes/superadmin.routes"));
const public_routes_1 = __importDefault(require("./routes/public.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const sync_job_1 = require("./jobs/sync.job");
const s3_routes_1 = __importDefault(require("./routes/s3.routes"));
dotenv_1.default.config();
// Swagger UI Integration
// Load OpenAPI YAML specification
const openApiSpec = yamljs_1.default.load(path_1.default.join(__dirname, '../docs/openapi.yaml'));
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// S3 Routes 
app.use('/api/s3', s3_routes_1.default);
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use("/api/students", student_routes_1.default);
app.use('/api/user', user_routes_1.default);
app.use('/api', public_routes_1.default); // Public routes (cities, batches)
app.use('/api/admin', admin_routes_1.default); // Teacher & Intern & admin
app.use('/api/superadmin', superadmin_routes_1.default); // Superadmin ONLY
// Swagger UI Documentation Route
// Developers can test all APIs interactively at /api-docs
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(openApiSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'DSA Tracker API Documentation'
}));
// Serve static files for CSV UI
app.use('/csv-ui', express_1.default.static(path_1.default.join(__dirname, 'csv_ui')));
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Error handler (must be last)
app.use(errorHandler_middleware_1.errorHandler);
// Initialize cron jobs for leaderboard optimization
(0, sync_job_1.startSyncJob)();
exports.default = app;
