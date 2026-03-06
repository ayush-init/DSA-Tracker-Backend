# 🎓 DSA Tracker Student Portal - Premium UI Design

> **Modern gamified learning experience with competitive features**  
> **Framework**: Next.js App Router + TypeScript + TailwindCSS  
> **Design System**: Material Design 3.0 + Custom Components  
> **Last Updated**: March 2025

---

## 🔐 Authentication & Token Structure

### **Student Login Response**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "city": {
      "id": 1,
      "city_name": "Bangalore",
      "slug": "bangalore"
    },
    "batch": {
      "id": 1,
      "batch_name": "SOT 2025",
      "slug": "batch-sot-2025"
    },
    "is_profile_complete": true,
    "leetcode_id": "johnleetcode",
    "gfg_id": "johngfg",
    "defaultCityId": 1,
    "defaultCityName": "Bangalore",
    "defaultBatchId": 1,
    "defaultBatchName": "SOT 2025",
    "defaultBatchSlug": "batch-sot-2025"
  }
}
```

### **JWT Token Payload (Decoded)**
```json
{
  "id": 123,
  "email": "john@example.com",
  "role": "STUDENT",
  "userType": "student",
  "batchId": 1,
  "batchName": "SOT 2025",
  "batchSlug": "batch-sot-2025",
  "cityId": 1,
  "cityName": "Bangalore",
  "iat": 1641234567,
  "exp": 1641849367
}
```

### **Token Usage in Frontend**
```typescript
// Automatic batch filtering - no need to pass batchId
const { data } = await api.get('/student/topics');
// Backend automatically filters by student's batch from token

// Access student info from token
const studentInfo = {
  batchId: decodedToken.batchId,
  batchName: decodedToken.batchName,
  cityId: decodedToken.cityId,
  cityName: decodedToken.cityName
};
```

---

## 🎯 Design Philosophy

### **Gamified & Engaging**
- Modern, vibrant interface with micro-interactions
- Progress tracking with visual feedback
- Competitive elements with leaderboards and streaks
- Achievement-based motivation system

### **Data-Driven Learning**
- Real-time progress visualization
- Personalized learning paths
- Performance analytics and insights
- Adaptive difficulty progression

### **Social & Competitive**
- City-wise and global competitions
- Real-time leaderboards
- Streak challenges and achievements
- Community engagement features

---

## 📋 Table of Contents

### 🏠 Student Portal Pages
- Home Page (Hero + Topics Preview)
- Topics Page (All Topics Overview)
- Topic Detail Page (Classes & Progress)
- Class Detail Page (Questions & Solutions)
- Profile Page (Stats & Streaks)
- Leaderboard Page (Competitions)
- Questions Page (Practice Hub)

---

## � Batch-Based Architecture - Understanding the Problem

### **🤔 The Core Challenge**

In our DSA Tracker system, each student belongs to a **specific batch** (e.g., SOT 2025, FSD 2025, DS 2025), and the architecture works as follows:
- **📚 Topics are SAME for all batches** - Arrays, Linked Lists, Trees, etc. are universal
- **📄 Classes are DIFFERENT per batch** - Each batch gets different class content for the same topic
- **❓ Questions are DIFFERENT per batch** - Question sets are customized per batch difficulty/curriculum
- **🎯 Progress is batch-specific** - Students compete within their batch

### **🏗️ Architecture Solution**

#### **1. Student Authentication Flow**
```http
POST /api/auth/student-login
{
  "email": "student@example.com",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "student_123",
    "name": "Dhruv Narang",
    "email": "student@example.com",
    "batchId": "batch_sot_2025",  // 🔑 KEY: Batch ID stored in token
    "batchName": "SOT 2025",
    "city": "Bangalore"
  }
}
```

#### **2. Token Structure**
```json
{
  "sub": "student_123",
  "batchId": "batch_sot_2025",  // Extracted from database during login
  "batchName": "SOT 2025",
  "cityId": "city_bangalore",   // 🔑 ALSO: City ID for city-wise features
  "cityName": "Bangalore",
  "role": "student",
  "iat": 1641234567,
  "exp": 1641320967
}
```

#### **3. How Middleware Actually Works**
```typescript
// middleware/auth.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// 🔑 Extend Request interface to include batch AND city info
interface AuthRequest extends Request {
  batchId?: string;
  batchName?: string;
  cityId?: string;        // 🏙️ City ID for city-wise features
  cityName?: string;      // 🏙️ City name for display
  studentId?: string;
}

export const authenticateStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Step 1: Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1]; // Get token after "Bearer "
    
    // Step 2: Verify and decode JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    // Step 3: Extract batch AND city info and attach to request object
    req.batchId = decoded.batchId;
    req.batchName = decoded.batchName;
    req.cityId = decoded.cityId;      // 🏙️ Extract city ID
    req.cityName = decoded.cityName;  // 🏙️ Extract city name
    req.studentId = decoded.sub;
    
    // Step 4: Continue to next middleware/controller
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

#### **4. How API Controllers Use Both Batch & City IDs**
```typescript
// controllers/leaderboard.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';

export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    // 🔑 Both batchId and cityId are automatically attached by middleware
    const { batchId, cityId, studentId } = req;
    
    const { type } = req.query; // 'global', 'city', 'batch'
    
    let leaderboard;
    
    switch (type) {
      case 'global':
        // 🌍 Global: All students across all batches and cities
        leaderboard = await Student.aggregate([
          { $match: { isActive: true } },
          {
            $lookup: {
              from: 'studentprogress',
              localField: '_id',
              foreignField: 'studentId',
              as: 'progress'
            }
          },
          {
            $addFields: {
              totalScore: { $sum: '$progress.points' },
              questionsSolved: { $size: '$progress' }
            }
          },
          { $sort: { totalScore: -1 } },
          { $limit: 100 }
        ]);
        break;
        
      case 'city':
        // 🏙️ City-wise: Students from same city across all batches
        leaderboard = await Student.aggregate([
          { $match: { isActive: true, cityId: cityId } },  // 🔑 Filter by city
          {
            $lookup: {
              from: 'studentprogress',
              localField: '_id',
              foreignField: 'studentId',
              as: 'progress'
            }
          },
          {
            $addFields: {
              totalScore: { $sum: '$progress.points' },
              questionsSolved: { $size: '$progress' }
            }
          },
          { $sort: { totalScore: -1 } },
          { $limit: 100 }
        ]);
        break;
        
      case 'batch':
        // 🎓 Batch-wise: Students from same batch across all cities
        leaderboard = await Student.aggregate([
          { $match: { isActive: true, batchId: batchId } },  // 🔑 Filter by batch
          {
            $lookup: {
              from: 'studentprogress',
              localField: '_id',
              foreignField: 'studentId',
              as: 'progress'
            }
          },
          {
            $addFields: {
              totalScore: { $sum: '$progress.points' },
              questionsSolved: { $size: '$progress' }
            }
          },
          { $sort: { totalScore: -1 } },
          { $limit: 100 }
        ]);
        break;
        
      case 'batch-city':
        // 🎯 Batch + City: Students from same batch AND same city
        leaderboard = await Student.aggregate([
          { 
            $match: { 
              isActive: true, 
              batchId: batchId,    // 🔑 Filter by batch
              cityId: cityId      // 🔑 Filter by city
            } 
          },
          {
            $lookup: {
              from: 'studentprogress',
              localField: '_id',
              foreignField: 'studentId',
              as: 'progress'
            }
          },
          {
            $addFields: {
              totalScore: { $sum: '$progress.points' },
              questionsSolved: { $size: '$progress' }
            }
          },
          { $sort: { totalScore: -1 } },
          { $limit: 100 }
        ]);
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid leaderboard type' });
    }
    
    // Find current student's rank in each leaderboard
    const studentRank = leaderboard.findIndex(student => 
      student._id.toString() === studentId
    ) + 1;
    
    res.json({
      type,
      studentRank,
      totalCount: leaderboard.length,
      leaderboard: leaderboard.map((student, index) => ({
        rank: index + 1,
        name: student.name,
        batchName: student.batchName,
        cityName: student.cityName,
        totalScore: student.totalScore,
        questionsSolved: student.questionsSolved,
        isCurrentUser: student._id.toString() === studentId
      }))
    });
    
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

#### **5. API Route Setup for Leaderboards**
```typescript
// routes/student.routes.ts
import express from 'express';
import { authenticateStudent } from '../middleware/auth';
import { getLeaderboard } from '../controllers/leaderboard.controller';

const router = express.Router();

// 🔑 All protected routes go through authentication middleware first
router.use(authenticateStudent);

// Leaderboard routes with different types
router.get('/leaderboard', getLeaderboard);  // ?type=global|city|batch|batch-city

export default router;
```

### **🔄 API Design Pattern**

#### **Pattern 1: No Batch ID in Request Body**
```http
# ❌ WRONG: Don't send batchId in body
GET /api/student/topics
Body: { "batchId": "batch_sot_2025" }  // DON'T DO THIS

# ✅ CORRECT: Middleware extracts batchId from token
GET /api/student/topics
Headers: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Middleware automatically adds req.batchId = "batch_sot_2025"
```

#### **Pattern 2: Middleware Flow Visualization**
```
Client Request → authMiddleware → Controller → Database
     │                │                │            │
     │                │                │            │
  Token with       Extract batchId   Use batchId   Filter by
  batchId          from token        in queries    batchId
     │                │                │            │
     └────────────────┴────────────────┴────────────┘
```

#### **Pattern 3: Real API Example**
```typescript
// GET /api/student/topics
// Headers: Authorization: Bearer <token_with_batchId>

export const getTopics = async (req: AuthRequest, res: Response) => {
  console.log('Batch ID from middleware:', req.batchId); // "batch_sot_2025"
  console.log('Student ID from middleware:', req.studentId); // "student_123"
  
  // Topics are same for all batches
  const allTopics = await Topic.find({ isActive: true });
  
  // But classes are filtered by batch
  const result = allTopics.map(topic => ({
    ...topic,
    classes: topic.classes.filter(class => class.batchId === req.batchId)
  }));
  
  res.json(result);
};
```

### **🎯 Complete API Design with Batch Architecture**

#### **Authentication & Batch Detection**
```http
POST /api/auth/student-login
POST /api/auth/student-register
POST /api/auth/refresh-token
POST /api/auth/logout
```

#### **Batch-Specific Home Page**
```http
GET /api/student/home
# Middleware: req.batchId = "batch_sot_2025"
# Returns: Universal topics + batch-specific classes/questions
```

#### **Topics Management (Universal Topics, Batch-Specific Content)**
```http
GET /api/student/topics
# Middleware: req.batchId = "batch_sot_2025"
# Returns: All topics (universal) with batch-specific classes

GET /api/student/topics/{topicSlug}
# Middleware: req.batchId = "batch_sot_2025"
# Returns: Topic details with classes filtered by batch

GET /api/student/topics/{topicSlug}/progress
# Middleware: req.batchId = "batch_sot_2025"
# Returns: Student's progress within their batch context
```

#### **Classes Management (Batch-Specific)**
```http
GET /api/student/topics/{topicSlug}/classes
# Middleware: req.batchId = "batch_sot_2025"
# Returns: Classes for this topic in student's batch only

GET /api/student/topics/{topicSlug}/classes/{classSlug}
# Middleware: req.batchId = "batch_sot_2025"
# Returns: Class details with batch-specific questions

GET /api/student/topics/{topicSlug}/classes/{classSlug}/questions
# Middleware: req.batchId = "batch_sot_2025"
# Returns: Questions assigned to this batch for this class
```

#### **Questions Management (Batch-Specific)**
```http
GET /api/student/questions
# Middleware: req.batchId = "batch_sot_2025"
# Returns: All questions assigned to student's batch

GET /api/student/questions/{questionId}
# Middleware: req.batchId = "batch_sot_2025"
# Returns: Question details (only if assigned to student's batch)

POST /api/student/questions/{questionId}/submit
# Middleware: req.batchId = "batch_sot_2025"
# Submit solution for batch-specific question
```

#### **Leaderboards (Multiple Types)**
```http
GET /api/student/leaderboard?type=global
# Returns: Global ranking across all batches and cities

GET /api/student/leaderboard?type=city
# Middleware: req.cityId = "city_bangalore"
# Returns: Ranking within student's city across all batches

GET /api/student/leaderboard?type=batch
# Middleware: req.batchId = "batch_sot_2025"
# Returns: Ranking within student's batch across all cities

GET /api/student/leaderboard?type=batch-city
# Middleware: req.batchId = "batch_sot_2025", req.cityId = "city_bangalore"
# Returns: Ranking within student's batch AND same city
```

### **🗄️ Database Schema Design**

#### **City Collection**
```typescript
interface City {
  _id: ObjectId;
  name: string;           // "Bangalore", "Mumbai", "Delhi", "Chennai"
  code: string;           // "city_bangalore", "city_mumbai"
  isActive: boolean;
  country: string;        // "India"
  timezone: string;       // "Asia/Kolkata"
}
```

#### **Batch Collection**
```typescript
interface Batch {
  _id: ObjectId;
  name: string;           // "SOT 2025", "FSD 2025"
  code: string;           // "batch_sot_2025"
  cityId: ObjectId;       // 🔑 Reference to city (batch belongs to a city)
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  topics: ObjectId[];     // Array of topic IDs assigned to this batch
  settings: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    questionCount: number;
    allowLeaderboard: boolean;
  };
}
```

#### **Student Collection (Batch & City Assignment)**
```typescript
interface Student {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;       // Hashed
  batchId: ObjectId;      // 🔑 Each student belongs to ONE batch
  batchName: string;      // Denormalized for convenience
  cityId: ObjectId;       // 🔑 Each student belongs to ONE city
  cityName: string;       // Denormalized for convenience
  isActive: boolean;
  joinedAt: Date;
  lastLoginAt: Date;
}
```

#### **Topic Collection (Universal)**
```typescript
interface Topic {
  _id: ObjectId;
  name: string;           // "Arrays", "Linked Lists" - Same for all batches
  slug: string;           // "arrays", "linked-lists"
  description: string;
  icon: string;
  order: number;          // Display order
  isActive: boolean;
  difficulty: string;     // General difficulty level
  // NO batchIds field - topics are universal
}
```

#### **Class Collection (Batch-Specific)**
```typescript
interface Class {
  _id: ObjectId;
  name: string;
  slug: string;
  description: string;
  topicId: ObjectId;      // References universal topic
  batchId: ObjectId;      // 🔑 Single batch ID - class belongs to ONE batch
  questions: ObjectId[];
  order: number;
  isActive: boolean;
  difficulty: string;     // Batch-specific difficulty adjustment
}
```

#### **Question Collection (Batch-Specific)**
```typescript
interface Question {
  _id: ObjectId;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  platform: string;
  batchId: ObjectId;      // 🔑 Single batch ID - question belongs to ONE batch
  topicId: ObjectId;      // References universal topic
  classId: ObjectId;      // References batch-specific class
  solution: string;
  hints: string[];
  points: number;
  isActive: boolean;
}
```

#### **Student Progress (Batch Context)**
```typescript
interface StudentProgress {
  _id: ObjectId;
  studentId: ObjectId;
  batchId: ObjectId;      // 🔑 Track progress within batch context
  topicId: ObjectId;      // Universal topic
  classId: ObjectId;      // Batch-specific class
  questionId: ObjectId;   // Batch-specific question
  status: 'not_started' | 'in_progress' | 'completed';
  solvedAt: Date;
  attempts: number;
  timeSpent: number;
  hintsUsed: number;
}
```

### **🔧 Implementation Strategy**

#### **Step 1: Authentication Setup**
```typescript
// auth.service.ts
export const loginStudent = async (email, password) => {
  const student = await Student.findOne({ email }).populate('batchId');
  
  const token = jwt.sign(
    {
      sub: student._id,
      batchId: student.batchId._id,
      batchName: student.batchId.name,
      city: student.city,
      role: 'student'
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  return { token, user: student };
};
```

#### **Step 2: Middleware Implementation**
```typescript
// middleware/auth.ts
export const authenticateStudent = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach batch info to request
    req.batchId = decoded.batchId;
    req.batchName = decoded.batchName;
    req.studentId = decoded.sub;
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
```

#### **Step 3: Service Layer with Batch Filtering**
```typescript
// topic.service.ts
export const getTopicsForBatch = async (batchId) => {
  return await Topic.find({ 
    batchIds: batchId,  // 🔑 Filter by batch
    isActive: true 
  })
  .populate({
    path: 'classes',
    match: { batchIds: batchId, isActive: true }
  })
  .sort({ order: 1 });
};
```

### **🎨 UI Design Impact**

#### **Home Page Changes**
```typescript
// Home page now shows batch-specific content
const HomePage = () => {
  const { data: homeData } = useQuery('/api/student/home');
  
  // homeData.topics are already filtered by student's batch
  // homeData.stats are batch-specific
  // homeData.leaderboard shows batch ranking
};
```

#### **Navigation Updates**
```typescript
// Add batch context to navigation
const Navigation = () => {
  const { batchName } = useAuth();  // Extracted from token
  
  return (
    <nav>
      <span>🎓 {batchName}</span>  // Show current batch
      {/* Other navigation items */}
    </nav>
  );
};
```

### **🚀 Benefits of This Architecture**

1. **🎯 Personalized Learning**: Each batch gets customized content
2. **🔒 Security**: Students can only access their batch's content
3. **📊 Fair Competition**: Leaderboards can be batch-specific
4. **🔄 Scalability**: Easy to add new batches with different content
5. **📈 Analytics**: Track performance per batch
6. **🎛️ Flexibility**: Admins can assign different topics to different batches

### **⚠️ Important Considerations**

1. **Token Size**: Including batch info in token increases size slightly
2. **Cache Strategy**: Need to cache batch-specific data
3. **Database Indexing**: Ensure proper indexes on batchId fields
4. **Content Management**: Admin panel needs batch assignment features
5. **Migration Strategy**: Existing data needs batch assignment

---

## 🔍 **Analysis of Your Current Architecture**

### **✅ What's Already Perfect in Your System**

#### **1. Database Schema - EXCELLENT!**
```typescript
// Your schema is perfectly designed for batch-based architecture:
model Student {
  id: Int
  name: String
  email: String
  city_id: Int?     // 🔑 Perfect for city-wise features
  batch_id: Int?    // 🔑 Perfect for batch-specific content
  batch: Batch?     // Relation to batch
  city: City?       // Relation to city
  progress: StudentProgress[]
}

model Batch {
  id: Int
  batch_name: String
  city_id: Int      // 🔑 Batch belongs to city
  slug: String      // 🔑 Perfect for URL routing
}

model Class {
  id: Int
  topic_id: Int
  batch_id: Int     // 🔑 Classes are batch-specific
  slug: String
}

model QuestionVisibility {
  id: Int
  class_id: Int
  question_id: Int  // 🔑 Questions assigned to specific batches/classes
}
```

#### **2. Admin Routes - PERFECT BATCH CONTEXT!**
```typescript
// Your admin routes are perfectly designed:
router.get("/:batchSlug/topics", getTopicsForBatch);
router.get("/:batchSlug/topics/:topicSlug/classes", getClassesByTopic);
router.get("/:batchSlug/topics/:topicSlug/classes/:classSlug", getClassDetails);

// This is EXACTLY what we need for students too!
```

#### **3. Authentication - GOOD BUT NEEDS BATCH INFO**
```typescript
// Current token structure:
interface AccessTokenPayload {
  id: number;
  email: string;
  role: "STUDENT" | AdminRole;
  userType: "student" | "admin";
}

// ❌ MISSING: batchId and cityId in token
```

---

## 🎯 **Required Changes for Student Architecture**

### **1. Update Token Generation (auth.controller.ts)**

#### **Current loginStudent function:**
```typescript
// ❌ CURRENT: No batch/city info in token
const accessToken = generateAccessToken({
  id: student.id,
  email: student.email,
  role: 'STUDENT',
  userType: 'student',
});
```

#### **✅ FIXED: Include batch and city info:**
```typescript
// ✅ UPDATED: Include batch and city info
const accessToken = generateAccessToken({
  id: student.id,
  email: student.email,
  role: 'STUDENT',
  userType: 'student',
  batchId: student.batch_id,        // 🔑 Add batch ID
  batchName: student.batch?.batch_name, // 🔑 Add batch name
  cityId: student.city_id,          // 🔑 Add city ID
  cityName: student.city?.city_name,   // 🔑 Add city name
});
```

### **2. Update JWT Token Interface (jwt.util.ts)**

#### **Current interface:**
```typescript
// ❌ CURRENT: Missing batch/city info
export interface AccessTokenPayload {
  id: number;
  email: string;
  role: "STUDENT" | AdminRole;
  userType: "student" | "admin";
}
```

#### **✅ UPDATED: Include batch and city info:**
```typescript
// ✅ UPDATED: Include batch and city info
export interface AccessTokenPayload {
  id: number;
  email: string;
  role: "STUDENT" | AdminRole;
  userType: "student" | "admin";
  batchId?: number;      // 🔑 Optional for students
  batchName?: string;    // 🔑 Optional for students
  cityId?: number;       // 🔑 Optional for students
  cityName?: string;     // 🔑 Optional for students
}
```

### **3. Create Student Middleware (student.middleware.ts)**

#### **✅ NEW: Extract batch/city info for students:**
```typescript
// src/middlewares/student.middleware.ts
import { Request, Response, NextFunction } from "express";
import { AccessTokenPayload } from "../utils/jwt.util";

export interface StudentRequest extends Request {
  student?: AccessTokenPayload;
  batchId?: number;
  batchName?: string;
  cityId?: number;
  cityName?: string;
}

export const extractStudentInfo = (req: StudentRequest, res: Response, next: NextFunction) => {
  const user = req.user as AccessTokenPayload;
  
  if (user?.userType === 'student') {
    // 🔑 Extract student-specific info
    req.student = user;
    req.batchId = user.batchId;
    req.batchName = user.batchName;
    req.cityId = user.cityId;
    req.cityName = user.cityName;
  }
  
  next();
};
```

---

## 🏗️ **Student Controller Design**

### **1. Student Routes (student.routes.ts)**

#### **✅ PERFECT: Mirror your admin route structure:**
```typescript
// src/routes/student.routes.ts
import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware";
import { extractStudentInfo } from "../middlewares/student.middleware";
import { 
  getHome, 
  getTopics, 
  getTopicDetails, 
  getClassesByTopic,
  getClassDetails,
  getQuestions,
  getLeaderboard,
  getProfile,
  submitQuestion
} from "../controllers/student/student.controller";

const router = Router();

// 🔑 Global protection for all student routes
router.use(verifyToken);
router.use(extractStudentInfo);

// ✅ Student routes (NO batchSlug needed - middleware handles it)
router.get("/home", getHome);
router.get("/topics", getTopics);
router.get("/topics/:topicSlug", getTopicDetails);
router.get("/topics/:topicSlug/classes", getClassesByTopic);
router.get("/topics/:topicSlug/classes/:classSlug", getClassDetails);
router.get("/questions", getQuestions);
router.get("/leaderboard", getLeaderboard);
router.get("/profile", getProfile);
router.post("/questions/:questionId/submit", submitQuestion);

export default router;
```

### **2. Student Controller Implementation**

#### **✅ EXAMPLE: getTopics controller:**
```typescript
// src/controllers/student/student.controller.ts
import { Response } from "express";
import prisma from "../../config/prisma";
import { StudentRequest } from "../../middlewares/student.middleware";

export const getTopics = async (req: StudentRequest, res: Response) => {
  try {
    const { batchId } = req;
    
    if (!batchId) {
      return res.status(400).json({ error: "Student not assigned to any batch" });
    }
    
    // 🔑 Get all topics (universal) with batch-specific classes
    const topics = await prisma.topic.findMany({
      include: {
        classes: {
          where: {
            batch_id: batchId,  // 🔑 Filter classes by student's batch
          },
          include: {
            questionVisibility: {
              include: {
                question: true,
              },
            },
          },
        },
      },
      orderBy: {
        topic_name: 'asc',
      },
    });
    
    // 🔑 Get student's progress for each topic
    const topicsWithProgress = await Promise.all(
      topics.map(async (topic) => {
        const totalQuestions = topic.classes.reduce(
          (sum, cls) => sum + cls.questionVisibility.length, 0
        );
        
        const solvedQuestions = await prisma.studentProgress.count({
          where: {
            student_id: req.student!.id,
            question: {
              topic_id: topic.id,
            },
          },
        });
        
        return {
          ...topic,
          totalQuestions,
          solvedQuestions,
          progressPercentage: totalQuestions > 0 ? (solvedQuestions / totalQuestions) * 100 : 0,
        };
      })
    );
    
    res.json(topicsWithProgress);
    
  } catch (error) {
    console.error("Get topics error:", error);
    res.status(500).json({ error: "Failed to get topics" });
  }
};
```

---

## 🎯 **Key Benefits of This Approach**

### **1. ✅ Uses Your Existing Architecture**
- **Database schema** - Perfect as-is, no changes needed
- **Admin routes** - Perfect structure, just mirror for students
- **Batch middleware** - Your `resolveBatch` approach is excellent

### **2. ✅ Minimal Changes Required**
- **Only 2 files need updates**: `jwt.util.ts` and `auth.controller.ts`
- **Add 1 new middleware**: `student.middleware.ts`
- **Create 1 new route file**: `student.routes.ts`

### **3. ✅ Leverages Your Strengths**
- **QuestionVisibility table** - Perfect for batch-specific questions
- **Batch-specific classes** - Already implemented correctly
- **Slug-based routing** - Clean URLs like `/topics/arrays/classes/basic`

### **4. ✅ Automatic Batch Filtering**
- **Middleware extracts batchId** - No need to pass in requests
- **Controllers automatically filter** - Clean, maintainable code
- **Security by default** - Students only see their content

---

## 🚀 **Implementation Steps**

### **Step 1**: Update JWT interfaces and token generation
### **Step 2**: Create student middleware
### **Step 3**: Create student routes mirroring admin structure
### **Step 4**: Implement student controllers using your existing patterns
### **Step 5**: Test with existing students in your database

**Your architecture is 90% perfect** - just need these small tweaks to support batch-aware student tokens!

---

## �� 1️⃣ Home Page - Hero Experience

**Route**: `/`

**API Used**:
```http
GET /api/student/home
GET /api/student/topics/preview
```

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ══════════════════════════════════════════════════════════════════════════ │
│  🚀 DSA TRACKER                                      🏆 Rank #42  🔥 7d  │
│  ══════════════════════════════════════════════════════════════════════════ │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 📚 Topics │ 🏆 Leaderboard │ ❓ Questions │ 👤 Profile              │ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        🌟 HERO SECTION                                │ │
│  │                                                                         │ │
│  │  ██████████  ███████  ████████  ███████ ███████                        │ │
│  │  ██       ██ ██          ██    ██      ██                              │ │
│  │  ██████████  █████       ██    ███████ ███████                        │ │
│  │  ██       ██ ██          ██         ██     ██                          │ │
│  │  ██████████  ███████     ██    ███████ ███████                        │ │
│  │                                                                         │ │
│  │             🎯 Master DSA • 🏆 Compete Globally • 🔥 Build Streaks      │ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  � Your Progress: 34 solved • 12 day streak • Bangalore #8       │ │ │
│  │  └─────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        📚 FEATURED TOPICS                             │ │
│  │                                                                         │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │ │
│  │  │ � Arrays   │ │ 🔗 Linked   │ │ 🌳 Trees    │ │ 🔒 Locked   │       │ │
│  │  │             │ │ Lists       │ │             │ │ Topic       │       │ │
│  │  │ ████████    │ │ ██████      │ │ █████       │ │ 🔒          │       │ │
│  │  │ 8/10 solved │ │ 6/8 solved  │ │ 3/6 solved  │ │ Unlock at   │       │ │
│  │  │ 5 classes   │ │ 4 classes   │ │ 6 classes   │ │ Level 5     │       │ │
│  │  │ 25 questions│ │ 18 questions│ │ 30 questions│ │             │       │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │ │
│  │                                                                         │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │ │
│  │  │ � Recursion│ │ 🎯 DP       │ │ 📈 Graphs   │ │ 🔒 Locked   │       │ │
│  │  │             │ │             │ │             │ │ Topic       │       │ │
│  │  │ ████        │ │ ██          │ │ █           │ │ 🔒          │       │ │
│  │  │ 2/7 solved  │ │ 0/5 solved  │ │ 0/4 solved  │ │ Unlock at   │       │ │
│  │  │ 7 classes   │ │ 8 classes   │ │ 5 classes   │ │ Level 8     │       │ │
│  │  │ 35 questions│ │ 40 questions│ │ 20 questions│ │             │       │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    🚀 View All Topics (25+)                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  🌟 Continue Learning • 🏆 Climb Ranks • 🔥 Daily Challenges              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 🎨 Home Page Features

#### **Visual Design**
- **Hero Section**: Welcome message with streak celebration
- **Progress Overview**: Visual progress bars with percentages
- **Topic Cards**: Grid layout with images and progress
- **Lock System**: Visual indicators for locked topics
- **Smooth Scrolling**: Infinite scroll or pagination

#### **Interactive Elements**
- **Topic Cards**: Click to navigate to topic detail
- **Progress Bars**: Animated fill based on completion
- **Hover Effects**: Card elevation and shadow changes
- **Streak Display**: Fire emoji and celebration effects

#### **Gamification**
- **Unlock System**: Topics unlock based on prerequisites
- **Progress Tracking**: Visual feedback for achievements
- **Rank Display**: City and global ranking
- **Streak Counter**: Daily activity tracking

---

## 📚 2️⃣ Topics Overview Page

**Route**: `/topics`

**API Used**:
```http
GET /api/student/topics
```

**Topics Response**:
```json
{
  "success": true,
  "data": {
    "topics": [
      {
        "id": 1,
        "topic_name": "Arrays",
        "slug": "arrays",
        "topic_image": "https://example.com/arrays-cover.jpg",
        "is_unlocked": true,
        "total_classes": 5,
        "total_questions": 25,
        "solved_questions": 18,
        "progress_percentage": 72,
        "difficulty_distribution": {
          "easy": 8,
          "medium": 7,
          "hard": 3
        },
        "estimated_time": "8 hours",
        "last_activity": "2025-03-05T14:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 8,
      "totalPages": 1
    },
    "stats": {
      "total_topics": 8,
      "unlocked_topics": 3,
      "locked_topics": 5,
      "overall_progress": 45.2
    }
  }
}
```

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📚 Topics Overview                                              │
│  ══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  📊 Overall Progress: 45.2% | 📚 Unlocked: 3/8 | 🔒 Locked: 5/8      │
│  ════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │ │
│  │ │ 📚 Arrays       │ │ 🔗 Linked Lists │ │ 🌳 Trees        │ │ │
│  │ │                 │ │                 │ │                 │ │ │
│  │ │ 18/25 solved     │ │ 12/20 solved     │ │ 🔒 LOCKED      │ │ │
│  │ │ ████████████████  │ │ ████████████      │ │                 │ │ │
│  │ │ 72% • 8h left   │ │ 60% • 4h left   │ │ 🔒 Prereq: Arrays │ │ │
│  │ └─────────────────┘ └─────────────────┘ └─────────────────┘ │ │
│  │                                                             │ │
│  │ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │ │
│  │ │ 🚀 Dynamic Prog │ │ 📈 Graphs       │ │ 🎮 Recursion    │ │ │
│  │ │                 │ │                 │ │                 │ │ │
│  │ │ 🔒 LOCKED        │ │ 🔒 LOCKED        │ │ 🔒 LOCKED      │ │ │
│  │ │                 │ │                 │ │                 │ │ │
│  │ └─────────────────┘ └─────────────────┘ └─────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Pagination: ← Previous 1 → Next (Showing 8 of 8)                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📚 3️⃣ Topic Detail Page

**Route**: `/topics/[topicSlug]`

**API Used**:
```http
GET /api/student/topics/{topicSlug}
GET /api/student/topics/{topicSlug}/classes
```

**Topic Detail Response**:
```json
{
  "success": true,
  "data": {
    "topic": {
      "id": 1,
      "topic_name": "Arrays",
      "slug": "arrays",
      "topic_image": "https://example.com/arrays-cover.jpg",
      "description": "Master the fundamentals of array data structures",
      "is_unlocked": true,
      "total_classes": 5,
      "total_questions": 25,
      "solved_questions": 18,
      "progress_percentage": 72,
      "difficulty_distribution": {
        "easy": 8,
        "medium": 7,
        "hard": 3
      },
      "estimated_completion_time": "2 hours"
    },
    "classes": [
      {
        "id": 1,
        "class_name": "Class 1 - Introduction",
        "class_date": "2025-02-01T10:00:00.000Z",
        "duration_minutes": 60,
        "total_questions": 5,
        "solved_questions": 4,
        "progress_percentage": 80,
        "status": "completed"
      },
      {
        "id": 2,
        "class_name": "Class 2 - Problem Solving",
        "class_date": "2025-02-03T14:00:00.000Z",
        "duration_minutes": 75,
        "total_questions": 8,
        "solved_questions": 3,
        "progress_percentage": 37.5,
        "status": "in_progress"
      }
    ]
  }
}
```

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📚 Arrays - Master the fundamentals                        │
│  ══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ 📖 Topic Description                                     │ │
│  │ Master the fundamentals of array data structures including     │ │
│  │ indexing, traversal, and common algorithms. Perfect for     │ │
│  │ beginners starting their DSA journey.                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  📊 Topic Progress: 18/25 solved (72%) • 🟢 8 easy • 🟡 7 medium • 🔴 3 hard │
│  ════════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  🏫 Classes Progress                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Class Name              │ Questions │ Progress │ Status     │ Date    │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ Class 1 - Introduction │ 5         │ 80%       │ ✅ Done  │ Feb 1   │ │
│  │ Class 2 - Problem Solving │ 8         │ 37.5%     │ 🔄 Active │ Feb 3   │ │
│  │ Class 3 - Advanced Arrays │ 6         │ 0%         │ ⏳ Upcoming │ Feb 5   │ │
│  │ Class 4 - Practice Session │ 4         │ 25%        │ 🔄 Active │ Feb 7   │ │
│  │ Class 5 - Assessment     │ 2         │ 100%       │ ✅ Done  │ Feb 10  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  🚀 Quick Actions: [📝 Start Next Class] [❓ Practice Questions] [📊 View Stats] │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏫 4️⃣ Class Detail Page

**Route**: `/topics/[topicSlug]/classes/[classSlug]`

**API Used**:
```http
GET /api/student/topics/{topicSlug}/classes/{classSlug}
GET /api/student/topics/{topicSlug}/classes/{classSlug}/questions
```

**Class Detail Response**:
```json
{
  "success": true,
  "data": {
    "class": {
      "id": 1,
      "class_name": "Class 1 - Introduction",
      "description": "Basic introduction to arrays and their operations",
      "pdf_url": "https://example.com/class1.pdf",
      "class_notes": "Arrays are fundamental data structures...",
      "duration_minutes": 60,
      "class_date": "2025-02-01T10:00:00.000Z",
      "topic": {
        "id": 1,
        "topic_name": "Arrays",
        "slug": "arrays"
      },
      "total_questions": 5,
      "solved_questions": 4
    },
    "questions": [
      {
        "id": 1,
        "question_name": "Two Sum",
        "question_link": "https://leetcode.com/problems/two-sum/",
        "platform": "LEETCODE",
        "level": "EASY",
        "type": "HOMEWORK",
        "is_solved": true,
        "solved_at": "2025-03-05T14:30:00.000Z",
        "attempts": 3,
        "time_taken": "15 minutes"
      },
      {
        "id": 2,
        "question_name": "Maximum Subarray",
        "question_link": "https://leetcode.com/problems/maximum-subarray/",
        "platform": "LEETCODE",
        "level": "MEDIUM",
        "type": "CLASSWORK",
        "is_solved": false,
        "solved_at": null,
        "attempts": 0,
        "time_taken": null
      },
      {
        "id": 3,
        "question_name": "3Sum",
        "question_link": "https://leetcode.com/problems/3sum/",
        "platform": "LEETCODE",
        "level": "MEDIUM",
        "type": "HOMEWORK",
        "is_solved": true,
        "solved_at": "2025-03-04T16:45:00.000Z",
        "attempts": 5,
        "time_taken": "25 minutes"
      }
    ]
  }
}
```

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏫 Class 1 - Introduction to Arrays                        │
│  ══════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  📅 Date: Feb 1, 2025 | ⏱️ Duration: 60 min | 📊 Progress: 4/5 (80%) │
│  ════════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ 📖 Class Description                                     │ │
│  │ Basic introduction to arrays and their operations. Learn      │ │
│  │ about indexing, traversal, and common algorithms.          │ │
│  │                                                         │ │
│  │ 📄 [📋 View Notes] [🎥 Watch Video] [📥 Download PDF] │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ❓ Questions (4/5 solved)                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Question              │ Platform │ Level │ Type   │ Status    │ Time    │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ ✅ Two Sum            │ LEETCODE │ EASY  │ HOMEWORK │ ✅ Solved │ 15m     │ │
│  │ ✅ 3Sum               │ LEETCODE │ MEDIUM│ HOMEWORK │ ✅ Solved │ 25m     │ │
│  │ 🔄 Maximum Subarray   │ LEETCODE │ MEDIUM│ CLASSWORK│ 🔄 Active │ -       │ │
│  │ ⏳ Trapping Rain Water│ LEETCODE │ HARD  │ HOMEWORK │ ⏳ Pending│ -       │ │
│  │ ⏳ Container With Most │ LEETCODE │ HARD  │ HOMEWORK │ ⏳ Pending│ -       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  🚀 Quick Actions: [📝 Solve Next] [💡 Get Hint] [📊 View Progress] │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ❓ 5️⃣ Questions Page

**Route**: `/questions`

**API Used**:
```http
GET /api/student/questions?topic={topic}&platform={platform}&level={level}&type={type}&search={search}&page={page}&limit={limit}
POST /api/student/questions/{questionId}/solve
```

**Questions Response**:
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": 1,
        "question_name": "Two Sum",
        "question_link": "https://leetcode.com/problems/two-sum/",
        "platform": "LEETCODE",
        "level": "EASY",
        "type": "HOMEWORK",
        "topic": {
          "id": 1,
          "topic_name": "Arrays",
          "slug": "arrays"
        },
        "is_solved": true,
        "solved_at": "2025-03-05T14:30:00.000Z",
        "attempts": 3,
        "time_taken": "15 minutes",
        "difficulty_score": 10
      },
      {
        "id": 2,
        "question_name": "Maximum Subarray",
        "question_link": "https://leetcode.com/problems/maximum-subarray/",
        "platform": "LEETCODE",
        "level": "MEDIUM",
        "type": "CLASSWORK",
        "topic": {
          "id": 1,
          "topic_name": "Arrays",
          "slug": "arrays"
        },
        "is_solved": false,
        "solved_at": null,
        "attempts": 0,
        "time_taken": null,
        "difficulty_score": 15
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    },
    "filters": {
      "available": {
        "topics": [
          {"id": 1, "topic_name": "Arrays", "slug": "arrays", "count": 25},
          {"id": 2, "topic_name": "Linked Lists", "slug": "linked-lists", "count": 20}
        ],
        "platforms": [
          {"platform": "LEETCODE", "count": 89},
          {"platform": "GFG", "count": 45},
          {"platform": "INTERVIEWBIT", "count": 15}
        ],
        "levels": [
          {"level": "EASY", "count": 65},
          {"level": "MEDIUM", "count": 71},
          {"level": "HARD", "count": 20}
        ]
      }
    }
  }
}
```

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ❓ Questions Practice                                         │
│  ════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  🔍 Filters:                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Topic: [Arrays ▼] │ Platform: [All ▼] │ Level: [All ▼] │ │
│  │ Search: [Two Sum___________________] │ [🔄 Clear Filters] │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  📊 Stats: 45/156 solved (28.8%) | 🟢 20 easy | 🟡 71 medium | 🔴 20 hard │
│  ════════════════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Question                    │ Topic │ Platform │ Level │ Status │ Time    │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ ✅ Two Sum                 │ Arrays │ LEETCODE │ EASY  │ ✅ Solved │ 15m     │ │
│  │ ✅ 3Sum                    │ Arrays │ LEETCODE │ MEDIUM│ ✅ Solved │ 25m     │ │
│  │ 🔄 Maximum Subarray         │ Arrays │ LEETCODE │ MEDIUM│ 🔄 Active │ -       │ │
│  │ ⏳ Trapping Rain Water      │ Arrays │ LEETCODE │ HARD  │ ⏳ Pending│ -       │ │
│  │ ⏳ Container With Most Water │ Arrays │ LEETCODE │ HARD  │ ⏳ Pending│ -       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Pagination: ← Previous 1 2 3 4 5 6 7 8 → (Showing 20 of 156) │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 👤 6️⃣ Profile Page

**Route**: `/profile`

**API Used**:
```http
GET /api/student/profile
GET /api/student/profile/stats
GET /api/student/profile/progress
```

**Profile Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Dhruv Narang",
      "username": "dhruv_dev",
      "email": "dhruv@example.com",
      "leetcode_id": "dhruv_lc",
      "gfg_id": "dhruv_gfg",
      "city": {
        "id": 2,
        "city_name": "Bangalore"
      },
      "batch": {
        "id": 1,
        "batch_name": "SOT 2025",
        "slug": "bangalore-sot-2025"
      },
      "avatar": "https://example.com/avatar.jpg",
      "join_date": "2025-01-15T00:00:00.000Z",
      "last_active": "2025-03-05T18:30:00.000Z"
    },
    "stats": {
      "total_solved": 45,
      "easy_solved": 20,
      "medium_solved": 18,
      "hard_solved": 7,
      "current_streak": 7,
      "max_streak": 12,
      "total_attempts": 127,
      "success_rate": 78.5,
      "average_time_per_question": "18.5 minutes",
      "rank": {
        "city_rank": 3,
        "global_rank": 15,
        "city_total": 28,
        "global_total": 156
      }
    },
    "topic_progress": [
      {
        "topic": {
          "id": 1,
          "topic_name": "Arrays",
          "slug": "arrays"
        },
        "solved_questions": 18,
        "total_questions": 25,
        "progress_percentage": 72,
        "last_activity": "2025-03-05T14:30:00.000Z"
      },
      {
        "topic": {
          "id": 2,
          "topic_name": "Linked Lists",
          "slug": "linked-lists"
        },
        "solved_questions": 12,
        "total_questions": 20,
        "progress_percentage": 60,
        "last_activity": "2025-03-04T16:45:00.000Z"
      }
    ],
    "achievements": [
      {
        "id": 1,
        "title": "First Steps",
        "description": "Solve your first question",
        "icon": "🎯",
        "earned_at": "2025-01-15T10:30:00.000Z",
        "is_rare": false
      },
      {
        "id": 2,
        "title": "Week Warrior",
        "description": "Maintain a 7-day streak",
        "icon": "🔥",
        "earned_at": "2025-03-05T20:00:00.000Z",
        "is_rare": true
      }
    ]
  }
}
```

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  👤 Profile - Dhruv Narang                                   │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  ┌─────────────────────┐ ┌─────────────────────────────────────────────┐ │
│  │ 📷 Avatar          │ │ 📊 Overall Statistics                      │ │
│  │                    │ │                                         │ │
│  │ ┌─────────────────┐ │ │ 🟢 Easy: 20    🟡 Medium: 18    🔴 Hard: 7   │ │
│  │ │                 │ │ ████████████    ██████████     ██████      │ │
│  │ │                 │ │ Total Solved: 45 questions                 │ │
│  │ └─────────────────┘ │ │ Success Rate: 78.5%                     │ │
│  └─────────────────────┘ └─────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─────────────────────┐ ┌─────────────────────────────────────────────┐ │
│  │ 📋 Details         │ │ 🔥 Streak & Ranking                      │ │
│  │                    │ │                                         │ │
│  │ 📧 dhruv@example.com│ │ Current: 7 days 🔥                       │ │
│  │ 🆔 dhruv_lc         │ │ Best: 12 days 🏆                        │ │
│  │ 📚 dhruv_gfg         │ │                                         │ │
│  │ 🏙 Bangalore, SOT 2025│ │ 🏆 City Rank: #3 (of 28)                 │ │
│  │ 📅 Joined: Jan 15     │ │ 🌍 Global Rank: #15 (of 156)             │ │
│  │ 🕐 Last Active: 6h ago │ │                                         │ │
│  └─────────────────────┘ └─────────────────────────────────────────────┘ │
│                                                                         │
│  📈 Topic Wise Progress                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Topic              │ Progress │ Last Activity │ Trend                │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ 📚 Arrays           │ 72%      │ 2h ago      │ 📈 Rising           │ │
│  │ 🔗 Linked Lists     │ 60%      │ 1d ago      │ 📊 Stable           │ │
│  │ 🌳 Trees            │ 0%       │ Never       │ ⏸ Not Started       │ │
│  │ 🚀 Dynamic Programming│ 🔒 Locked  │ Never       │ ⏸ Not Started       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  🏆 Achievements                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ 🎯 First Steps    🔥 Week Warrior    🎓 Problem Solver    🏆 Master │ │
│  │ Jan 15          Mar 5          Feb 20          Apr 1          │ │
│  │ Common           Rare           Common           Epic           │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  🚀 Quick Actions: [📝 Edit Profile] [📊 View Stats] [🏆 Leaderboard] │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏆 7️⃣ Leaderboard Page

**Route**: `/leaderboard`

**API Used**:
```http
GET /api/student/leaderboard?type={global|city}&city={cityId}&year={year}&period={daily|weekly|monthly}
```

**Leaderboard Response**:
```json
{
  "success": true,
  "data": {
    "leaderboard_type": "global",
    "period": "monthly",
    "filters": {
      "selected_city": null,
      "selected_year": 2025,
      "available_cities": [
        {"id": 1, "city_name": "Mumbai", "participant_count": 45},
        {"id": 2, "city_name": "Bangalore", "participant_count": 68}
      ],
      "available_years": [2023, 2024, 2025]
    },
    "rankings": [
      {
        "rank": 1,
        "user": {
          "id": 5,
          "name": "Alex Chen",
          "username": "alex_chen",
          "avatar": "https://example.com/alex.jpg",
          "city": {
            "id": 1,
            "city_name": "Mumbai"
          }
        },
        "stats": {
          "total_solved": 89,
          "easy_solved": 35,
          "medium_solved": 42,
          "hard_solved": 12,
          "current_streak": 15,
          "score": 890
        },
        "badge": "🥇",
        "rank_change": "up",
        "rank_change_value": 2
      },
      {
        "rank": 2,
        "user": {
          "id": 8,
          "name": "Sarah Johnson",
          "username": "sarah_j",
          "avatar": "https://example.com/sarah.jpg",
          "city": {
            "id": 2,
            "city_name": "Bangalore"
          }
        },
        "stats": {
          "total_solved": 85,
          "easy_solved": 40,
          "medium_solved": 35,
          "hard_solved": 10,
          "current_streak": 12,
          "score": 850
        },
        "badge": "🥈",
        "rank_change": "down",
        "rank_change_value": 1
      },
      {
        "rank": 3,
        "user": {
          "id": 1,
          "name": "Dhruv Narang",
          "username": "dhruv_dev",
          "avatar": "https://example.com/dhruv.jpg",
          "city": {
            "id": 2,
            "city_name": "Bangalore"
          }
        },
        "stats": {
          "total_solved": 78,
          "easy_solved": 32,
          "medium_solved": 38,
          "hard_solved": 8,
          "current_streak": 10,
          "score": 780
        },
        "badge": "🥉",
        "rank_change": "up",
        "rank_change_value": 5
      }
    ],
    "user_rank": {
      "rank": 15,
      "total_participants": 156
    },
    "stats": {
      "total_participants": 156,
      "average_score": 412.5,
      "top_score": 890,
      "competition_level": "high"
    }
  }
}
```

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏆 Leaderboard                                                │
│  ════════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  🎯 Competition: Global Rankings • 2025 • Monthly • 156 Participants      │
│  ══════════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  🔍 Filters:                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Type: [Global ▼] │ City: [All Cities ▼] │ Year: [2025 ▼] │ │
│  │ Period: [Monthly ▼] │ [🔄 Apply Filters] │ [📊 View Stats] │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│  ══════════════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  🏆 Top 3 Performers                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ 🥇 Alex Chen        🥈 Sarah Johnson    🥉 Dhruv Narang   │ │
│  │                    │                    │                    │ │
│  │ 📊 Score: 890      📊 Score: 850      📊 Score: 780     │ │
│  │ 🔥 15 day streak   🔥 12 day streak   🔥 10 day streak    │ │
│  │ 🏙 Mumbai          🏙 Bangalore       🏙 Bangalore        │ │
│  │ 📈 +2 positions   📉 -1 position    📈 +5 positions    │ │
│  │ 🎯 35/42/12       🎯 40/35/10       🎯 32/38/8        │ │
│  │ [👤 View Profile]  [👤 View Profile]   [👤 View Profile]     │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  📊 Your Ranking: #15 (of 156) • Score: 780 • 🏙 Bangalore: #3    │
│  ════════════════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  📈 Full Leaderboard (Top 50)                                │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Rank │ User                    │ Score │ Streak │ City    │ Change  │ Actions  │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ 🥇 1 │ 🥇 Alex Chen            │ 890   │ 🔥 15   │ Mumbai  │ 📈 +2   │ [👤] [💬] │ │
│  │ 🥈 2 │ 🥈 Sarah Johnson        │ 850   │ 🔥 12   │ Bangalore│ 📉 -1   │ [👤] [💬] │ │
│  │ 🥉 3 │ 🥉 Dhruv Narang        │ 780   │ 🔥 10   │ Bangalore│ 📈 +5   │ [👤] [💬] │ │
│  │ 4th │ 🥉 Mike Wilson           │ 750   │ 🔥 8    │ Mumbai  │ 📉 -1   │ [👤] [💬] │ │
│  │ 5th │ 🥉 Emma Davis           │ 720   │ 🔥 6    │ Bangalore│ 📊 0    │ [👤] [💬] │ │
│  │ ... │ ...                    │ ...   │ ...    │ ...     │ ...     │ ...      │ │
│  │ 50th │ 🥉 Tom Brown           │ 410   │ 🔥 2    │ Mumbai  │ 📈 +10  │ [👤] [💬] │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Pagination: ← Previous 1 2 3 → (Showing 50 of 156)              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Premium Design Features

### **Gamification Elements**
- **Achievement Badges**: Visual rewards for milestones
- **Progress Bars**: Animated completion indicators
- **Streak Tracking**: Daily activity with fire effects
- **Ranking System**: City and global leaderboards
- **Unlock System**: Topic progression with locks

### **Visual Excellence**
- **Modern Cards**: Glass morphism with shadows
- **Smooth Animations**: 300ms transitions
- **Color Coding**: Difficulty levels with consistent palette
- **Responsive Grid**: Adaptive layouts for all devices

### **Interactive Features**
- **Hover Effects**: Card elevation and scale transforms
- **Loading States**: Skeleton loaders and spinners
- **Micro-interactions**: Button states and feedback
- **Real-time Updates**: WebSocket integration for live data

### **Data Visualization**
- **Progress Charts**: Topic-wise completion graphs
- **Statistics Displays**: Comprehensive performance metrics
- **Trend Indicators**: Visual rank changes
- **Achievement Notifications**: Toast messages for milestones

---

## 🔧 Technical Implementation

### **API Requirements Summary**

#### **Authentication & Profile**
- `GET /api/student/dashboard` - Dashboard data
- `GET /api/student/profile` - User profile info
- `POST /api/auth/student-login` - Student login
- `POST /api/auth/google-login` - Google OAuth

#### **Topics & Classes**
- `GET /api/student/topics` - Available topics
- `GET /api/student/topics/{slug}` - Topic details
- `GET /api/student/topics/{slug}/classes` - Topic classes
- `GET /api/student/topics/{slug}/classes/{classSlug}` - Class details

#### **Questions & Progress**
- `GET /api/student/questions` - Question library with filters
- `POST /api/student/questions/{id}/solve` - Mark question solved
- `GET /api/student/topics/{slug}/classes/{classSlug}/questions` - Class questions

#### **Leaderboard & Competition**
- `GET /api/student/leaderboard` - Rankings with filters
- `GET /api/student/leaderboard/stats` - Competition statistics

### **Key Design Principles**
- **Mobile First**: Optimized for all screen sizes
- **Accessibility**: WCAG 2.1 compliant
- **Performance**: Lazy loading and code splitting
- **Real-time**: WebSocket integration for live updates
- **Gamification**: Progress tracking and achievements

---

## 🔗 Complete API Routes Required for Student Portal

### **Authentication Routes**
```http
POST /api/auth/student-login
POST /api/auth/student-register
POST /api/auth/refresh-token
POST /api/auth/logout
POST /api/auth/google-login
```

### **Home Page Routes**
```http
GET /api/student/home
GET /api/student/topics/preview
GET /api/student/stats/overview
```

### **Topics Management Routes**
```http
GET /api/student/topics
GET /api/student/topics/{topicSlug}
GET /api/student/topics/{topicSlug}/progress
GET /api/student/topics/{topicSlug}/classes
```

### **Class Management Routes**
```http
GET /api/student/topics/{topicSlug}/classes/{classSlug}
GET /api/student/topics/{topicSlug}/classes/{classSlug}/questions
GET /api/student/topics/{topicSlug}/classes/{classSlug}/progress
```

### **Question Management Routes**
```http
GET /api/student/questions
GET /api/student/questions/{questionId}
GET /api/student/questions/{questionId}/solution
POST /api/student/questions/{questionId}/submit
GET /api/student/questions/filters
POST /api/student/questions/{questionId}/solve
```

### **Profile & Stats Routes**
```http
GET /api/student/profile
GET /api/student/profile/stats
GET /api/student/profile/streak
GET /api/student/profile/achievements
PUT /api/student/profile
GET /api/student/dashboard
```

### **Leaderboard Routes**
```http
GET /api/student/leaderboard/global
GET /api/student/leaderboard/city
GET /api/student/leaderboard/year
GET /api/student/leaderboard/rank/{studentId}
GET /api/student/leaderboard
GET /api/student/leaderboard/stats
```

### **Progress & Analytics Routes**
```http
GET /api/student/progress/overview
GET /api/student/progress/topics
GET /api/student/progress/classes
GET /api/student/progress/daily
GET /api/student/analytics/performance
```

### **Submission & Solution Routes**
```http
POST /api/student/submissions
GET /api/student/submissions/history
GET /api/student/submissions/{submissionId}
GET /api/student/solutions/{questionId}
```

### **Hints & Help Routes**
```http
GET /api/student/hints/{questionId}
POST /api/student/hints/{questionId}/use
GET /api/student/concepts/{topicSlug}
```

### **Achievements & Gamification Routes**
```http
GET /api/student/achievements
GET /api/student/achievements/unlocked
POST /api/student/achievements/claim
GET /api/student/xp/history
```

### **Notifications & Activity Routes**
```http
GET /api/student/notifications
POST /api/student/notifications/read
GET /api/student/activity/recent
GET /api/student/activity/feed
```

---

## 🎯 Total API Endpoints Summary

### **Authentication**: 5 endpoints
### **Home & Overview**: 3 endpoints
### **Topics**: 4 endpoints
### **Classes**: 3 endpoints
### **Questions**: 6 endpoints
### **Profile & Stats**: 5 endpoints
### **Leaderboard**: 6 endpoints
### **Progress & Analytics**: 5 endpoints
### **Submissions & Solutions**: 4 endpoints
### **Hints & Help**: 3 endpoints
### **Achievements & Gamification**: 4 endpoints
### **Notifications & Activity**: 4 endpoints

### **Total: 52 API Endpoints**

---

## 🚀 Implementation Priority

### **Phase 1: Core Functionality**
1. Authentication System (5 endpoints)
2. Home Page with Topics Preview (3 endpoints)
3. Topics Overview Page (4 endpoints)
4. Basic Profile Page (5 endpoints)
5. Questions Listing (6 endpoints)

### **Phase 2: Enhanced Features**
1. Topic Detail Pages (4 endpoints)
2. Class Detail Pages (3 endpoints)
3. Leaderboard System (6 endpoints)
4. Progress Tracking (5 endpoints)
5. Submission System (4 endpoints)

### **Phase 3: Advanced Features**
1. Streak System (3 endpoints)
2. Achievement System (4 endpoints)
3. Advanced Analytics (5 endpoints)
4. Notification System (4 endpoints)
5. Gamification Elements (4 endpoints)

---

*This design document provides a comprehensive blueprint for building an engaging, gamified student interface with 52 API endpoints that motivates learning and tracks progress effectively.*
