# DSA Tracker API Documentation

## 🔐 Authentication

### Base URL: `http://localhost:5000`

### Authentication Headers
All protected routes require:
```
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
Content-Type: application/json
```

---

##  AUTH ROUTES (`/api/auth`)

### Student Registration
- **POST** `/api/auth/student/register`
- **Body**: 
```json
{
  "name": "Student Name",
  "email": "student@example.com",
  "username": "student123",
  "password": "password123"
}
```
- **Response**: 
```json
{
  "message": "Student registered successfully",
  "token": "jwt_token_here",
  "user": { "id": 1, "name": "Student", "email": "student@example.com", "username": "student123" }
}
```

### Student Login
- **POST** `/api/auth/student/login`
- **Body**: 
```json
{
  "email": "student@example.com",
  "password": "password123"
}
```
- **Response**: 
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": { "id": 1, "name": "Student", "email": "student@example.com", "username": "student123" }
}
```

### Admin Login (All Admin Roles)
- **POST** `/api/auth/admin/login`
- **Body**: 
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```
- **Response**: 
```json
{
  "message": "Login successful",
  "accessToken": "jwt_token_here",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": 1,
    "name": "Admin Name",
    "email": "admin@example.com",
    "username": "admin123",
    "role": "SUPERADMIN"
  }
}
```

---

## 👑 SUPERADMIN ROUTES (`/api/superadmin`)
**Access**: SuperAdmin only
**Authentication**: Required (Bearer Token)

### Cities Management
- **GET** `/api/superadmin/cities`
- **Response**: Array of all cities
```json
[
  {
    "id": 1,
    "city_name": "Mumbai",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

- **POST** `/api/superadmin/cities`
- **Body**: 
```json
{
  "city_name": "New City"
}
```
- **Response**: 
```json
{
  "message": "City created successfully",
  "city": { "id": 2, "city_name": "New City", "created_at": "..." }
}
```

- **PATCH** `/api/superadmin/cities/:id`
- **Params**: `id` (city ID)
- **Body**: 
```json
{
  "city_name": "Updated City Name"
}
```

- **DELETE** `/api/superadmin/cities/:id`
- **Params**: `id` (city ID)
- **Response**: 
```json
{
  "message": "City deleted successfully"
}
```

### Batches Management
- **GET** `/api/superadmin/batches`
- **Response**: Array of all batches with city info
```json
[
  {
    "id": 1,
    "batch_name": "Batch A",
    "year": 2024,
    "city_id": 1,
    "slug": "batch-a",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

- **POST** `/api/superadmin/batches`
- **Body**: 
```json
{
  "batch_name": "New Batch",
  "year": 2024,
  "city_id": 1
}
```
- **Response**: 
```json
{
  "message": "Batch created successfully",
  "batch": { "id": 2, "batch_name": "New Batch", "year": 2024, "city_id": 1 }
}
```

- **PATCH** `/api/superadmin/batches/:id`
- **Params**: `id` (batch ID)
- **Body**: 
```json
{
  "batch_name": "Updated Batch",
  "year": 2024,
  "city_id": 1
}
```

- **DELETE** `/api/superadmin/batches/:id`
- **Params**: `id` (batch ID)
- **Response**: 
```json
{
  "message": "Batch deleted successfully"
}
```

### Admin Management (Create Teachers/Interns)
- **POST** `/api/superadmin/admins`
- **Body**: 
```json
{
  "name": "Teacher Name",
  "email": "teacher@example.com",
  "username": "teacher123",
  "password": "password123",
  "role": "TEACHER"
}
```
- **Response**: 
```json
{
  "message": "Admin registered successfully",
  "accessToken": "jwt_token_here",
  "refreshToken": "refresh_token_here",
  "user": { "id": 2, "name": "Teacher", "email": "teacher@example.com", "role": "TEACHER" }
}
```

### System Statistics
- **GET** `/api/superadmin/stats`
- **Response**: 
```json
{
  "stats": {
    "totalCities": 5,
    "totalBatches": 12,
    "totalStudents": 150,
    "totalAdmins": 8,
    "totalQuestions": 500,
    "totalTopics": 25
  }
}
```

---

## 🎓 ADMIN ROUTES (`/api/admin`)
**Access**: All Admin Roles (SuperAdmin, Teacher, Intern)
**Authentication**: Required (Bearer Token)

### Global Routes (No Batch Context)

#### Cities
- **GET** `/api/admin/cities`
- **Response**: Array of all cities

#### Batches
- **GET** `/api/admin/batches`
- **Response**: Array of all batches

- **POST** `/api/admin/batches`
- **Body**: 
```json
{
  "batch_name": "New Batch",
  "year": 2024,
  "city_id": 1
}
```

#### Topics (Global)
- **GET** `/api/admin/topics`
- **Response**: Array of all topics
```json
[
  {
    "id": 1,
    "topic_name": "Arrays",
    "slug": "arrays",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

- **POST** `/api/admin/topics`
- **Access**: Teacher or SuperAdmin only
- **Body**: 
```json
{
  "topic_name": "New Topic"
}
```
- **Response**: 
```json
{
  "message": "Topic created successfully",
  "topic": { "id": 2, "topic_name": "New Topic", "slug": "new-topic" }
}
```

#### Questions (Global)
- **GET** `/api/admin/questions`
- **Query Params**: 
  - `topic_id` (optional): Filter by topic
  - `level` (optional): Filter by level (EASY, MEDIUM, HARD)
  - `platform` (optional): Filter by platform (LEETCODE, GFG, OTHER)
- **Response**: Array of questions with filters applied

### Workspace Routes (Batch Context)
**All routes below require**: `batchSlug` parameter

#### Topics for Batch
- **GET** `/api/admin/:batchSlug/topics`
- **Params**: `batchSlug` (batch slug)
- **Response**: Topics assigned to this batch

#### Classes Management
- **GET** `/api/admin/:batchSlug/topics/:topicSlug/classes`
- **Params**: `batchSlug`, `topicSlug`
- **Response**: Classes for this topic in this batch

- **POST** `/api/admin/:batchSlug/topics/:topicSlug/classes`
- **Access**: Teacher or SuperAdmin only
- **Body**: 
```json
{
  "class_number": "Class 1",
  "class_date": "2025-02-01T10:00:00.000Z",
  "pdf_url": "https://example.com/class1.pdf",
  "description": "Introduction to Arrays",
  "duration_minutes": 60
}
```

- **GET** `/api/admin/:batchSlug/classes/:classSlug`
- **Params**: `batchSlug`, `classSlug`
- **Response**: Single class details with questions

#### Question Assignment
- **GET** `/api/admin/questions`
- **Response**: All questions (same as global)

- **POST** `/api/admin/:batchSlug/classes/:classSlug/questions`
- **Access**: Teacher or SuperAdmin only
- **Body**: 
```json
{
  "question_ids": [1, 2, 3, 4, 5]
}
```
- **Response**: 
```json
{
  "message": "Questions assigned successfully",
  "assigned_count": 5
}
```

- **DELETE** `/api/admin/:batchSlug/classes/:classSlug/questions/:questionId`
- **Access**: Teacher or SuperAdmin only
- **Params**: `batchSlug`, `classSlug`, `questionId`
- **Response**: 
```json
{
  "message": "Question removed from class successfully"
}
```

---

## 👨‍🎓 STUDENT ROUTES (`/api/student`)
**Access**: Students only
**Authentication**: Required (Bearer Token)

### Profile Management
- **GET** `/api/student/profile`
- **Response**: 
```json
{
  "id": 1,
  "name": "Student Name",
  "email": "student@example.com",
  "username": "student123",
  "city": { "id": 1, "city_name": "Mumbai" },
  "batch": { "id": 1, "batch_name": "Batch A", "year": 2024 },
  "leetcode_id": "leetcode123",
  "gfg_id": "gfg123",
  "is_profile_complete": true
}
```

- **PATCH** `/api/student/profile`
- **Body**: 
```json
{
  "city_id": 1,
  "batch_id": 1,
  "leetcode_id": "leetcode123",
  "gfg_id": "gfg123",
  "enrollment_id": "ENR001"
}
```

### Assigned Questions
- **GET** `/api/student/questions`
- **Query Params**: 
  - `topic_id` (optional): Filter by topic
  - `level` (optional): Filter by level
  - `platform` (optional): Filter by platform
- **Response**: 
```json
{
  "questions": [
    {
      "id": 1,
      "question_name": "Two Sum",
      "question_link": "https://leetcode.com/problems/two-sum/",
      "platform": "LEETCODE",
      "level": "EASY",
      "type": "HOMEWORK",
      "topic": { "topic_name": "Arrays" },
      "is_solved": true
    }
  ]
}
```

- **GET** `/api/student/questions/:questionId`
- **Params**: `questionId`
- **Response**: Single question details with solve status

- **GET** `/api/student/classes/:classId/questions`
- **Params**: `classId`
- **Response**: Questions for specific class

### Mark Questions as Solved
- **POST** `/api/student/questions/:questionId/solve`
- **Params**: `questionId`
- **Body**: `{}` (empty or optional metadata)
- **Response**: 
```json
{
  "message": "Question marked as solved successfully"
}
```

### Progress Tracking
- **GET** `/api/student/progress`
- **Response**: 
```json
{
  "total_solved": 20,
  "by_level": { "EASY": 8, "MEDIUM": 10, "HARD": 2 },
  "by_platform": { "LEETCODE": 15, "GFG": 5 },
  "by_topic": { "Arrays": 10, "Linked Lists": 5 },
  "by_type": { "HOMEWORK": 12, "CLASSWORK": 8 }
}
```

- **GET** `/api/student/progress/topics`
- **Response**: 
```json
[
  {
    "topic_name": "Arrays",
    "total_questions": 25,
    "solved": 10,
    "percentage": 40
  }
]
```

- **GET** `/api/student/progress/levels`
- **Response**: 
```json
{
  "EASY": { "total": 50, "solved": 30, "percentage": 60 },
  "MEDIUM": { "total": 40, "solved": 15, "percentage": 37.5 },
  "HARD": { "total": 10, "solved": 2, "percentage": 20 }
}
```

- **GET** `/api/student/progress/recent`
- **Query Params**: `limit` (optional, default 10)
- **Response**: 
```json
{
  "recently_solved": [
    {
      "question_name": "Two Sum",
      "level": "EASY",
      "solved_at": "2025-02-01T10:30:00.000Z"
    }
  ]
}
```

### Dashboard
- **GET** `/api/student/dashboard`
- **Response**: 
```json
{
  "profile": { "name": "Student", "batch": { "batch_name": "Batch A" }, "city": { "city_name": "Mumbai" } },
  "stats": {
    "total_solved": 20,
    "rank_in_batch": 5,
    "rank_in_city": 25,
    "streak": 7
  },
  "progress": { "by_level": {...}, "by_topic": {...} },
  "recent_solved": [...],
  "upcoming_classes": [...],
  "pending_questions": [...]
}
```

- **GET** `/api/student/stats`
- **Response**: 
```json
{
  "total_solved": 20,
  "rank_in_batch": 5,
  "rank_in_city": 25,
  "percentile_in_batch": 90,
  "streak_days": 7,
  "last_solved_at": "2025-02-01T10:30:00.000Z"
}
```

### Leaderboard
- **GET** `/api/student/leaderboard/batch`
- **Response**: 
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "student": { "name": "Top Student", "username": "top123" },
      "solved_count": 45
    },
    {
      "rank": 5,
      "student": { "name": "You", "username": "your123" },
      "solved_count": 20,
      "is_me": true
    }
  ]
}
```

- **GET** `/api/student/leaderboard/city`
- **Response**: City-wide leaderboard with current student highlighted

- **GET** `/api/student/leaderboard/rank`
- **Response**: 
```json
{
  "rank_in_batch": 5,
  "total_in_batch": 50,
  "rank_in_city": 25,
  "total_in_city": 200,
  "percentile_batch": 90,
  "percentile_city": 87.5
}
```

### Classes
- **GET** `/api/student/classes`
- **Response**: 
```json
{
  "classes": [
    {
      "id": 1,
      "class_number": "Class 1",
      "topic": { "topic_name": "Arrays" },
      "class_date": "2025-02-05T10:00:00.000Z",
      "pdf_url": "https://example.com/class1.pdf",
      "total_questions": 10,
      "solved_questions": 7,
      "completion_percentage": 70
    }
  ]
}
```

- **GET** `/api/student/classes/:classId`
- **Params**: `classId`
- **Response**: Single class details with questions and solve status

### Bookmarks
- **POST** `/api/student/bookmarks/:questionId`
- **Params**: `questionId`
- **Response**: 
```json
{
  "message": "Question bookmarked successfully"
}
```

- **DELETE** `/api/student/bookmarks/:questionId`
- **Params**: `questionId`
- **Response**: 
```json
{
  "message": "Question removed from bookmarks"
}
```

- **GET** `/api/student/bookmarks`
- **Response**: 
```json
{
  "bookmarks": [
    {
      "id": 1,
      "question": {
        "question_name": "Two Sum",
        "level": "EASY",
        "platform": "LEETCODE",
        "is_solved": true
      },
      "bookmarked_at": "2025-02-01T10:30:00.000Z"
    }
  ]
}
```

### Search & Filters
- **GET** `/api/student/questions/search`
- **Query Params**: `q` (search term)
- **Response**: Questions matching search term with solve status

### Analytics
- **GET** `/api/student/analytics/weekly`
- **Response**: Questions solved per day for last 7 days
```json
{
  "weekly_progress": {
    "2025-01-28": 3,
    "2025-01-29": 2,
    "2025-01-30": 4,
    "2025-01-31": 1,
    "2025-02-01": 2,
    "2025-02-02": 3,
    "2025-02-03": 1
  }
}
```

- **GET** `/api/student/analytics/monthly`
- **Response**: Questions solved per day for last 30 days

### Pending & Upcoming
- **GET** `/api/student/questions/pending`
- **Response**: 
```json
{
  "pending_questions": [
    {
      "id": 2,
      "question_name": "Best Time to Buy Stock",
      "level": "MEDIUM",
      "is_solved": false
    }
  ],
  "count": 5
}
```

- **GET** `/api/student/classes/upcoming`
- **Response**: Upcoming classes (future class_date)

---

## 🎯 Error Responses

### Standard Error Format
```json
{
  "error": "Error message here"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created successfully
- `400` - Bad request (missing/invalid data)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Internal server error

---

## 🔑 Role Hierarchy

1. **SUPERADMIN** - Full system access
2. **TEACHER** - Can manage topics, questions, classes
3. **INTERN** - Limited admin access
4. **STUDENT** - Can view progress, solve questions, bookmark

---

## 📱 Usage Examples

### 1. SuperAdmin creates city
```bash
curl -X POST http://localhost:5000/api/superadmin/cities \
  -H "Authorization: Bearer SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"city_name": "Pune"}'
```

### 2. Teacher creates topic
```bash
curl -X POST http://localhost:5000/api/admin/topics \
  -H "Authorization: Bearer TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic_name": "Dynamic Programming"}'
```

### 3. Student solves question
```bash
curl -X POST http://localhost:5000/api/student/questions/123/solve \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -d '{}'
```

### 4. Get student progress
```bash
curl -X GET http://localhost:5000/api/student/progress \
  -H "Authorization: Bearer STUDENT_TOKEN"
```

---

## 🚀 Quick Start Guide

1. **Create SuperAdmin**: `POST /api/auth/admin/login` with existing SuperAdmin credentials
2. **Create Cities**: `POST /api/superadmin/cities`
3. **Create Batches**: `POST /api/superadmin/batches`
4. **Create Teachers**: `POST /api/superadmin/admins` with `role: "TEACHER"`
5. **Create Topics**: `POST /api/admin/topics` (Teacher+)
6. **Create Questions**: `POST /api/admin/questions` (Teacher+)
7. **Create Classes**: `POST /api/admin/:batchSlug/topics/:topicSlug/classes`
8. **Assign Questions**: `POST /api/admin/:batchSlug/classes/:classSlug/questions`
9. **Students Solve**: `POST /api/student/questions/:questionId/solve`

---

*API Documentation Complete* 🎉