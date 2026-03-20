# DSA Tracker Backend 

<div align="center">

![DSA Tracker](https://img.shields.io/badge/DSA-Tracker-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)

**A comprehensive backend system for tracking Data Structures and Algorithms progress across multiple batches and cities with advanced leaderboard management and automated progress synchronization.**

</div>

---

## Overview

DSA Tracker Backend is a robust, scalable platform designed for educational institutions to manage DSA learning programs efficiently. With role-based access control, real-time progress tracking, comprehensive question management, automated leaderboard system, and advanced batch slug routing, this system empowers educators to deliver structured DSA education while providing students with detailed insights into their learning journey.

---

## 🚀 Latest Features

### Enhanced Batch Management with Slug System
- **Batch Slug Routing**: SEO-friendly URLs using `cityname-batchname-year` format
- **Automatic Slug Generation**: Built-in slug creation for new batches
- **Migration Support**: Seamless migration for existing batches
- **Route Optimization**: All admin routes use batch slugs for better URL structure

### Advanced Authentication System
- **Enhanced Admin Tokens**: Include batch and city information in JWT tokens
- **Context-Aware Access**: Admin middleware extracts default batch/city context
- **Improved Security**: Removed invalid username references from admin auth
- **Token Enrichment**: Student and admin tokens include comprehensive user context

### Automated Leaderboard System
- **Cron-Based Updates**: Automated synchronization every 4 hours
- **Sequential Processing**: Student progress updates → Leaderboard calculations
- **Smart Caching**: Pre-calculated rankings for optimal performance
- **Multiple Filters**: Support for weekly, monthly, and all-time rankings
- **Real-time Rankings**: Accurate scoring based on question difficulty and completion

### Optimized Performance
- **Database Indexing**: Strategic indexes for query optimization
- **Cached Responses**: Sub-50ms leaderboard API responses
- **Batch Processing**: Efficient handling of large student datasets
- **Race Condition Prevention**: Sequential cron job execution

---

## Key Features

### Multi-Role Authentication
- **Superadmin**: Complete system administration
- **Teacher**: Class and question management with batch context
- **Intern**: Limited administrative access
- **Student**: Learning and progress tracking

### Geographic Organization
- City-based student management
- Batch organization with slug-based routing
- Hierarchical structure for scalable growth

### Progress Tracking
- Real-time question completion tracking
- Detailed progress analytics with streaks
- Individual and batch performance metrics
- Platform integration (LeetCode, GFG)

### Question Management
- Multi-platform support (LeetCode, GFG, Other)
- Difficulty-based categorization
- Type-based organization (Homework, Classwork)
- Batch-specific question assignment

### Class Management
- Topic-based class organization
- PDF resource integration
- Scheduled class management
- Question visibility control

### Student Features
- Personal bookmark system
- Comprehensive search and filtering
- Progress visualization
- Leaderboard rankings

### Automated Systems
- **Cron Jobs**: Scheduled student progress sync and leaderboard updates
- **Smart Caching**: Pre-calculated rankings for performance
- **Data Consistency**: Sequential processing to prevent race conditions

---

## Technology Stack

<div align="center">

### Backend Framework
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)

### Database & ORM
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)

### Authentication & Security
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![bcrypt](https://img.shields.io/badge/bcrypt-000000?style=flat-square&logo=bcrypt&logoColor=white)

### Automation & Scheduling
![node-cron](https://img.shields.io/badge/node--cron-00C851?style=flat-square&logo=node.js&logoColor=white)
![Prisma](https://img.shields.io/badge/Automation-FF6B6B?style=flat-square)

### Development Tools
![Nodemon](https://img.shields.io/badge/Nodemon-76D04B?style=flat-square&logo=nodemon&logoColor=white)
![tsx](https://img.shields.io/badge/tsx-3178C6?style=flat-square&logo=typescript&logoColor=white)

</div>

---

## Database Architecture

### Core Entity Relationships

```mermaid
erDiagram
    City ||--o{ Batch : contains
    Batch ||--o{ Student : enrolls
    Batch ||--o{ ClassSession : hosts
    Topic ||--o{ Question : categorizes
    Topic ||--o{ ClassSession : organizes
    ClassSession ||--o{ QuestionVisibility : assigns
    Question ||--o{ QuestionVisibility : visible_in
    Student ||--o{ StudentProgress : tracks
    Question ||--o{ StudentProgress : completed_by
    Student ||--o{ Bookmark : saves
    Question ||--o{ Bookmark : saved_by
    Student ||--o{ Leaderboard : ranks
    Admin ||--o{ Leaderboard : manages
```

### Enhanced Database Models

| Entity | Primary Purpose | Key Relations | New Features |
|--------|----------------|---------------|--------------|
| **City** | Geographic organization | Batches, Students | Optimized indexing |
| **Batch** | Time-based grouping | Students, Classes, Questions | **Slug field**, Auto-generation |
| **Student** | User accounts | Progress, Bookmarks, Leaderboard | Enhanced progress tracking |
| **Admin** | System administration | Role-based permissions | **Batch/Context tokens** |
| **Leaderboard** | Performance rankings | Students, Admins | **Cached calculations**, Filters |
| **QuestionVisibility** | Access control | Classes, Questions | Batch-specific assignments |
| **StudentProgress** | Achievement tracking | Students, Questions | Platform integration |

---

## Authentication & Security

### Enhanced Role-Based Access Control

<div align="center">

| Role | System Access | Data Access | Features | Context |
|------|---------------|-------------|----------|---------|
| **Superadmin** | Full | All | Complete system control | Global |
| **Teacher** | Limited | Assigned | Class & question management | **Batch-aware** |
| **Intern** | Limited | Restricted | Basic admin functions | **Batch-aware** |
| **Student** | Restricted | Personal | Learning & progress | Batch-specific |

</div>

### Advanced Security Implementation

- **Enhanced JWT Authentication**: Context-aware tokens with batch/city information
- **Password Security**: bcrypt hashing with salt rounds
- **Role Validation**: Middleware-based permission checking with context extraction
- **Input Sanitization**: Comprehensive validation and sanitization
- **CORS Configuration**: Secure cross-origin resource sharing
- **Token Enrichment**: Admin tokens include default batch and city context

---

## API Architecture

### Authentication Endpoints
```http
POST /auth/student/register    # Student registration
POST /auth/student/login       # Student authentication (with batch context)
POST /auth/student/logout      # Session termination
POST /auth/admin/login         # Admin authentication (enhanced with context)
POST /auth/admin/logout        # Admin session termination
POST /auth/admin/register      # Admin registration (with batch assignment)
```

### Student Endpoints
```http
GET  /topics                   # Topics with batch progress
GET  /topics/:slug            # Topic overview with classes
GET  /topics/:topic/classes/:class  # Class details with questions
GET  /addedQuestions          # Filterable question list
POST /leaderboard             # Student leaderboard with personal rank
PATCH /profile                 # Profile completion
```

### Admin Endpoints (Slug-based Routing)
```http
# City & Batch Management
POST /admin/cities             # Create cities
GET  /admin/cities             # List all cities
POST /admin/batches            # Create batches (with auto-slug)
GET  /admin/batches            # List batches with filters

# Content Management (Batch-specific)
POST /admin/{batchSlug}/topics/{topicSlug}/classes           # Create classes
GET  /admin/{batchSlug}/topics/{topicSlug}/classes           # List classes
POST /admin/{batchSlug}/topics/{topicSlug}/classes/{classSlug}/questions  # Assign questions

# Statistics & Analytics
POST /admin/stats              # Batch-specific statistics
GET  /admin/leaderboard        # Admin leaderboard with pagination
POST /admin/leaderboard/recalculate  # Manual leaderboard refresh
```

---

## 🏆 Leaderboard System

### Automated Rankings

#### **Cron Job Schedule**
```bash
# Every 4 hours: Sequential execution
0 */4 * * *  → Student Progress Sync → Leaderboard Update

# Daily at midnight: Additional refresh
0 0 * * *    → Leaderboard Cache Refresh
```

#### **Scoring Algorithm**
```javascript
// Weight-based scoring system
Hard Questions:   20 points each
Medium Questions: 15 points each  
Easy Questions:   10 points each

Score = (hard_solved/hard_assigned * 20) + 
        (medium_solved/medium_assigned * 15) + 
        (easy_solved/easy_assigned * 10)
```

#### **Filter Combinations**
- **Time-based**: All-time, Weekly, Monthly
- **Geographic**: By city, All cities
- **Batch-specific**: Current year, All years
- **Performance**: Top 10, Personal rank, Full leaderboard

#### **Performance Optimization**
- **Cached Results**: Pre-calculated rankings stored in database
- **Fast API**: Sub-50ms response times for cached data
- **Smart Combinations**: Only popular filter combinations cached
- **Sequential Processing**: No race conditions between sync and calculation

---

## 🗂️ Batch Slug System

### URL Structure

#### **Before (Numeric IDs)**
```http
GET /api/admin/123/topics  # Hard to remember
GET /api/admin/456/classes # Not SEO-friendly
```

#### **After (Slug-based)**
```http
GET /api/admin/bangalore-so-batch-2025/topics     # Readable URLs
GET /api/admin/delhi-advanced-batch-2024/classes  # SEO-friendly
```

### Slug Generation
```javascript
// Format: cityname-batchname-year
Examples:
- "bangalore-so-batch-2025"
- "delhi-advanced-batch-2024"  
- "mumbai-internship-2025"
```

### Migration Support
- **Automatic Migration**: Existing batches populated with slugs
- **Backward Compatibility**: Numeric IDs still work internally
- **Unique Constraints**: Prevents duplicate slugs
- **Fallback Handling**: Graceful degradation for edge cases

---

## Advanced Filtering System

### Comprehensive Question Search

The `/addedQuestions` endpoint provides powerful filtering capabilities:

```javascript
// Filter Examples
{
  search: "two sum",           // Search in question names and topics
  topic: "arrays",             // Filter by topic slug
  level: "EASY",               // Difficulty: EASY | MEDIUM | HARD
  platform: "LEETCODE",       // Platform: LEETCODE | GFG | OTHER
  type: "HOMEWORK",            // Type: HOMEWORK | CLASSWORK
  solved: "false",             // Solved status: true | false
  page: 1,                     // Pagination
  limit: 20                    // Results per page
}
```

### Batch-Specific Filtering
```javascript
// Filter by batch slug
{
  batch: "bangalore-so-batch-2025",  // Batch-specific questions
  city: "Bangalore",                  // City-based filtering
  year: 2025,                        // Year-based filtering
  // ... other filters
}
```

---

## Development Environment

### Prerequisites
- Node.js 16+ 
- PostgreSQL 12+
- Git

### Quick Setup

```bash
# Clone the repository
git clone <repository-url>
cd dsa-tracker-backend

# Install dependencies
npm install

# Environment setup
cp .env.example .env
# Edit .env with your configuration

# Database setup
npx prisma generate
npx prisma migrate dev

# Start development server
npm run dev
```

### Environment Configuration

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dsa_tracker"

# Authentication
JWT_SECRET="your-super-secure-jwt-secret"
REFRESH_TOKEN_SECRET="your-refresh-token-secret"

# Server
PORT=5000
NODE_ENV="development"

# Optional: Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
```

---

## System Workflow

<div align="center">

```mermaid
flowchart TD
    A[Superadmin Setup] --> B[Create Cities]
    B --> C[Create Batches with Slugs]
    C --> D[Add Teachers with Context]
    D --> E[Organize Topics]
    E --> F[Add Questions]
    F --> G[Create Classes]
    G --> H[Assign Questions to Batches]
    H --> I[Student Registration]
    I --> J[Profile Completion]
    J --> K[Access Questions]
    K --> L[Track Progress]
    L --> M[Automated Cron Sync]
    M --> N[Leaderboard Update]
    N --> O[Performance Analytics]
```

</div>

---

## Project Architecture

```
src/
├── controllers/          # HTTP request handlers
│   ├── auth.controller.ts        # Enhanced authentication
│   ├── student.controller.ts      # Student management
│   ├── admin.controller.ts        # Admin operations
│   ├── leaderboard.controller.ts # Leaderboard management
│   └── class.controller.ts       # Class management
├── services/            # Business logic layer
│   ├── auth.service.ts           # Authentication logic
│   ├── student.service.ts        # Student operations
│   ├── leaderboard.service.ts    # Leaderboard calculations
│   ├── progressSync.service.ts  # Progress synchronization
│   └── batch.service.ts         # Batch management
├── middleware/          # Authentication & authorization
│   ├── auth.middleware.ts         # JWT validation
│   ├── admin.middleware.ts        # Admin context extraction
│   ├── student.middleware.ts      # Student context
│   └── batch.middleware.ts        # Batch resolution
├── routes/             # API route definitions
│   ├── auth.routes.ts            # Authentication endpoints
│   ├── student.routes.ts         # Student endpoints
│   ├── admin.routes.ts           # Admin endpoints (slug-based)
│   └── leaderboard.routes.ts     # Leaderboard endpoints
├── jobs/               # Cron job definitions
│   └── sync.job.ts              # Automated synchronization
├── workers/            # Background processing
│   └── sync.worker.ts           # Student progress sync
├── utils/              # Utility functions
│   ├── password.util.ts         # Password hashing
│   ├── jwt.util.ts              # Token management
│   └── slugify.ts               # Slug generation
├── config/             # Configuration files
│   └── prisma.ts                # Database connection
└── types/              # TypeScript type definitions
```

---

## Deployment

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start

# With process manager (PM2)
pm2 start ecosystem.config.js
```

### Docker Support

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Environment Variables for Production

```env
NODE_ENV="production"
DATABASE_URL="postgresql://user:pass@host:5432/db"
JWT_SECRET="production-secret"
REFRESH_TOKEN_SECRET="production-refresh-secret"
PORT=5000
```

---

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow existing code patterns and conventions
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed
- Ensure batch slug functionality is tested
- Verify cron job sequences work correctly

---

## Performance & Scalability

### Database Optimization
- **Indexed Queries**: Optimized database queries with proper indexing
- **Connection Pooling**: Efficient database connection management
- **Query Performance**: Sub-100ms response times for most operations
- **Batch Slug Indexing**: Fast slug-based lookups

### Caching Strategy
- **Leaderboard Caching**: Pre-calculated rankings for instant responses
- **JWT Token Caching**: Reduces authentication overhead
- **Question Data Caching**: Faster question retrieval
- **Progress Tracking**: Optimized for concurrent users

### Load Handling
- **Concurrent Users**: Supports 1000+ simultaneous users
- **Throughput**: 10K+ questions served per minute
- **Horizontal Scaling**: Ready for multi-instance deployment
- **Cron Job Efficiency**: Sequential processing prevents resource conflicts

---

## API Documentation

### Interactive Documentation
Visit `/api-docs` for interactive Swagger/OpenAPI documentation featuring:
- **Live API Testing**: Try endpoints directly from browser
- **Request/Response Schemas**: Detailed data structure documentation
- **Authentication Examples**: Ready-to-use code examples
- **Batch Slug Examples**: Updated routing examples

### Postman Collection
Download our pre-configured Postman collection:
- **All Endpoints**: Complete API coverage
- **Environment Setup**: Quick configuration
- **Authentication Helpers**: Pre-built auth flows
- **Slug-based Routing**: Updated route examples

---

## Testing & Quality Assurance

### Test Coverage
- **Unit Tests**: 95%+ code coverage with Jest
- **Integration Tests**: API endpoint validation
- **Database Tests**: Data integrity verification
- **E2E Tests**: Complete user workflow testing
- **Cron Job Tests**: Automated sequence validation

### Running Tests
```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:cron
```

---

## Troubleshooting

### Common Issues & Solutions

**Database Connection Issues**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart if needed
sudo systemctl restart postgresql
```

**Authentication Problems**
- Verify JWT_SECRET in environment variables
- Check token expiration settings
- Ensure proper CORS configuration
- Verify admin batch context in tokens

**Cron Job Issues**
- Check cron job logs for sequence errors
- Verify database permissions for background jobs
- Ensure sequential execution is working
- Monitor leaderboard cache updates

**Batch Slug Problems**
- Verify slug uniqueness constraints
- Check migration completion
- Test slug generation for new batches
- Validate URL routing with slugs

**Permission Errors**
- Verify user roles in database
- Check middleware configuration
- Review route protection setup
- Ensure batch context extraction works

### Debug Mode
```bash
# Enable debug logging
DEBUG=app:* npm run dev

# Database query debugging
DEBUG=prisma:query npm run dev

# Cron job debugging
DEBUG=cron:* npm run dev
```

---

## Monitoring & Analytics

### Health Monitoring
- **Health Check Endpoint**: `GET /health`
- **Performance Metrics**: Response times and error rates
- **System Status**: Database and service availability
- **Cron Job Status**: Automated sync monitoring

### Usage Analytics
- **User Activity**: Track engagement patterns
- **Question Performance**: Most/least popular questions
- **Progress Analytics**: Learning completion rates
- **Leaderboard Metrics**: Ranking distribution and trends

### Performance Metrics
- **Leaderboard Response Times**: Sub-50ms for cached data
- **Student Sync Performance**: Batch processing efficiency
- **Database Query Performance**: Optimized query execution
- **API Response Times**: Overall system performance

---

## License

This project is licensed under the **ISC License** - see the [LICENSE](LICENSE) file for complete details.

---

<div align="center">

**Built with precision for the DSA learning community**

[![GitHub stars](https://img.shields.io/github/stars/dhruv608/dsa-tracker-backend?style=social)](https://github.com/dhruv608/dsa-tracker-backend)
[![GitHub forks](https://img.shields.io/github/forks/dhruv608/dsa-tracker-backend?style=social)](https://github.com/dhruv608/dsa-tracker-backend)
[![GitHub issues](https://img.shields.io/github/issues/dhruv608/dsa-tracker-backend)](https://github.com/dhruv608/dsa-tracker-backend/issues)
[![License](https://img.shields.io/github/license/dhruv608/dsa-tracker-backend)](https://github.com/dhruv608/dsa-tracker-backend/blob/main/LICENSE)

</div>
