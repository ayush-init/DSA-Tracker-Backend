# DSA Tracker Backend API Documentation

## Table of Contents

1. [Authentication](#authentication)
2. [Student APIs](#student-apis)
3. [Admin APIs](#admin-apis)
4. [SuperAdmin APIs](#superadmin-apis)
5. [Health Check](#health-check)
6. [S3 APIs](#s3-apis)
7. [Common Response Formats](#common-response-formats)
8. [Error Handling](#error-handling)

---

## Authentication

### Base URL: `/api/auth`

All authentication endpoints are **public** and don't require authentication tokens.

#### 1. Student Registration
**Endpoint:** `POST /api/auth/student/register`

**Request Body:**
```json
{
  "name": "string",
  "email": "string", 
  "username": "string",
  "password": "string",
  "batch_id": "number",
  "leetcode_id": "string (optional)",
  "gfg_id": "string (optional)",
  "github": "string (optional)",
  "linkedin": "string (optional)",
  "enrollment_id": "string (optional)"
}
```

**Response:**
```json
{
  "message": "Student registered successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "batch_id": 1,
    "city_id": 1,
    "leetcode_id": "john123",
    "gfg_id": "john456",
    "github": "johndoe",
    "linkedin": "https://linkedin.com/in/johndoe",
    "enrollment_id": "ENR123"
  }
}
```

#### 2. Student Login
**Endpoint:** `POST /api/auth/student/login`

**Request Body:**
```json
{
  "email": "string (optional)",
  "username": "string (optional)",
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "username": "johndoe",
    "role": "STUDENT",
    "userType": "student",
    "batchId": 1,
    "batchSlug": "batch-2024",
    "cityId": 1
  },
  "tokens": {
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

#### 3. Student Logout
**Endpoint:** `POST /api/auth/student/logout`

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "message": "Logout successful"
}
```

#### 4. Admin Login
**Endpoint:** `POST /api/auth/admin/login`

**Request Body:**
```json
{
  "email": "string (optional)",
  "username": "string (optional)",
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "username": "admin",
    "role": "SUPERADMIN|TEACHER|INTERN",
    "userType": "admin",
    "batchId": 1,
    "batchSlug": "batch-2024",
    "cityId": 1
  },
  "tokens": {
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

#### 5. Refresh Token
**Endpoint:** `POST /api/auth/refresh-token`

**Description:** Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Response:**
```json
{
  "message": "Token refreshed successfully",
  "tokens": {
    "accessToken": "new_jwt_token_here",
    "refreshToken": "new_refresh_token_here"
  }
}
```

#### 6. Google OAuth Login
**Endpoint:** `POST /api/auth/google-login`

**Description:** Login using Google OAuth.

**Request Body:**
```json
{
  "idToken": "google_id_token_here"
}
```

**Response:**
```json
{
  "message": "Google login successful",
  "user": {
    "id": 1,
    "email": "user@gmail.com",
    "username": "user123",
    "role": "STUDENT",
    "userType": "student",
    "batchId": 1,
    "batchSlug": "batch-2024",
    "cityId": 1
  },
  "tokens": {
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

#### 7. Forgot Password
**Endpoint:** `POST /api/auth/forgot-password`

**Description:** Send OTP to email for password reset.

**Request Body:**
```json
{
  "email": "string"
}
```

**Response:**
```json
{
  "message": "OTP sent to your email successfully",
  "email": "user@example.com"
}
```

#### 8. Reset Password
**Endpoint:** `POST /api/auth/reset-password`

**Description:** Reset password using OTP verification.

**Request Body:**
```json
{
  "email": "string",
  "otp": "string",
  "newPassword": "string"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

---

## Student APIs

### Base URL: `/api/students`

All endpoints require **authentication + STUDENT role**.

#### 1. Get Topics with Batch Progress
**Endpoint:** `GET /api/students/topics`

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "topics": [
    {
      "id": 1,
      "topic_name": "Arrays",
      "slug": "arrays",
      "batchSpecificData": {
        "totalClasses": 5,
        "totalQuestions": 25,
        "solvedQuestions": 15
      }
    }
  ]
}
```

#### 2. Get Topic Overview
**Endpoint:** `GET /api/students/topics/:topicSlug`

**Response:**
```json
{
  "id": 1,
  "topic_name": "Arrays",
  "slug": "arrays",
  "description": "Array data structures and algorithms",
  "classes": [
    {
      "id": 1,
      "class_name": "Basic Arrays",
      "slug": "basic-arrays",
      "duration_minutes": 120,
      "description": "Introduction to arrays",
      "totalQuestions": 10,
      "solvedQuestions": 7
    }
  ],
  "overallProgress": {
    "totalClasses": 5,
    "totalQuestions": 25,
    "solvedQuestions": 15
  }
}
```

#### 3. Get Class Details with Questions
**Endpoint:** `GET /api/students/topics/:topicSlug/classes/:classSlug`

**Response:**
```json
{
  "id": 1,
  "class_name": "Basic Arrays",
  "slug": "basic-arrays",
  "description": "Introduction to arrays",
  "duration_minutes": 120,
  "pdf_url": "https://example.com/class.pdf",
  "class_date": "2024-01-01T10:00:00.000Z",
  "created_at": "2024-01-01T09:00:00.000Z",
  "topic": {
    "id": 1,
    "topic_name": "Arrays",
    "slug": "arrays"
  },
  "totalQuestions": 10,
  "solvedQuestions": 7,
  "questions": [
    {
      "id": 1,
      "questionName": "Two Sum",
      "questionLink": "https://leetcode.com/problems/two-sum/",
      "platform": "LEETCODE",
      "level": "EASY",
      "type": "ARRAY",
      "topic": {
        "id": 1,
        "topic_name": "Arrays",
        "slug": "arrays"
      },
      "isSolved": true,
      "syncAt": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

#### 4. Get All Questions with Filters
**Endpoint:** `GET /api/students/addedQuestions`

**Description:** Get all questions with filtering options and solved status.

**Query Parameters (All Optional):**
- `search`: Search by question name or topic
- `level`: Filter by difficulty (EASY, MEDIUM, HARD)
- `platform`: Filter by platform (LEETCODE, GFG, OTHER, INTERVIEWBIT)
- `topic`: Filter by topic slug
- `type`: Filter by type (HOMEWORK, CLASSWORK)
- `solved`: Filter by solved status (true/false)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Example:** `GET /api/students/addedQuestions?level=EASY&solved=true&page=1&limit=10`

**Response:**
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
      "topic": {
        "id": 1,
        "topic_name": "Arrays",
        "slug": "arrays"
      },
      "isSolved": true,
      "syncAt": "2024-01-01T10:00:00.000Z",
      "created_at": "2024-01-01T09:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalQuestions": 50,
    "totalPages": 5
  },
  "filters": {
    "topics": [
      {
        "id": 1,
        "topic_name": "Arrays",
        "slug": "arrays"
      }
    ],
    "levels": ["EASY", "MEDIUM", "HARD"],
    "platforms": ["GFG", "INTERVIEWBIT", "LEETCODE", "OTHER"],
    "types": ["CLASSWORK", "HOMEWORK"]
  },
  "stats": {
    "total": 50,
    "solved": 25
  }
}
```

#### 5. Get Student Leaderboard
**Endpoint:** `POST /api/students/leaderboard`

**Description:** Get leaderboard with top 10 students and student's personal rank.

**Request Body:**
```json
{
  "city": "all|city_name",
  "type": "weekly|monthly|all",
  "year": 2024
}
```

**Filters:**
- `city`: "all" for global rank, or specific city name for city rank
- `type`: "weekly" for weekly leaderboard, "monthly" for monthly, "all" for all-time
- `year`: Filter by batch year

**Response:**
```json
{
  "top10": [
    {
      "student_id": 1,
      "name": "John Doe",
      "username": "johndoe",
      "batch_year": 2024,
      "city_name": "New York",
      "max_streak": 5,
      "easy_solved": 85.5,
      "medium_solved": 72.3,
      "hard_solved": 45.8,
      "total_solved": 67.87,
      "rank": 1
    }
  ],
  "yourRank": {
    "rank": 15,
    "student_id": 15,
    "name": "Jane Smith",
    "username": "janesmith",
    "batch_year": 2024,
    "city_name": "New York",
    "max_streak": 3,
    "easy_solved": 65.2,
    "medium_solved": 58.9,
    "hard_solved": 32.1,
    "total_solved": 52.07
  },
  "filters": {
    "city": "all",
    "year": 2024,
    "type": "all"
  }
}
```

#### 7. Get Public Student Profile
**Endpoint:** `GET /api/students/profile/:username`

**Description:** Get public student profile by username (no authentication required).

**Path Parameters:**
- `username`: Student username

**Response:**
```json
{
  "student": {
    "name": "John Doe",
    "username": "johndoe",
    "batch": "Batch 2024",
    "year": 2024,
    "city": "New York",
    "leetcode": "john123",
    "gfg": "john456"
  },
  "codingStats": {
    "totalSolved": 243,
    "totalAssigned": 741,
    "easy": {
      "assigned": 215,
      "solved": 118
    },
    "medium": {
      "assigned": 388,
      "solved": 104
    },
    "hard": {
      "assigned": 138,
      "solved": 21
    }
  },
  "streak": {
    "currentStreak": 1,
    "maxStreak": 5
  },
  "leaderboard": {
    "globalRank": 15,
    "cityRank": 3
  },
  "heatmap": [
    {
      "date": "2024-01-01T00:00:00.000Z",
      "count": 5
    }
  ],
  "recentActivity": [
    {
      "problemTitle": "Two Sum",
      "difficulty": "EASY",
      "solvedAt": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

---

## Admin APIs

### Base URL: `/api/admin`

All admin endpoints require **authentication + ADMIN role** (SuperAdmin, Teacher, Intern).

#### 1. Get Cities
**Endpoint:** `GET /api/admin/cities`

**Description:** Get all available cities.

**Response:**
```json
{
  "cities": [
    {
      "id": 1,
      "city_name": "New York",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 2. Get Batches
**Endpoint:** `GET /api/admin/batches`

**Description:** Get all batches with optional filters.

**Query Parameters (Optional):**
- `city_id`: Filter by city ID
- `year`: Filter by batch year

**Response:**
```json
{
  "batches": [
    {
      "id": 1,
      "batch_name": "Batch 2024",
      "slug": "batch-2024",
      "year": 2024,
      "city_id": 1,
      "city": {
        "city_name": "New York"
      },
      "easy_assigned": 215,
      "medium_assigned": 388,
      "hard_assigned": 138,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 3. Get Topics
**Endpoint:** `GET /api/admin/topics`

**Description:** Get all topics.

**Response:**
```json
{
  "topics": [
    {
      "id": 1,
      "topic_name": "Arrays",
      "slug": "arrays",
      "description": "Array data structures and algorithms",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 4. Create Topic (Teacher+)
**Endpoint:** `POST /api/admin/topics`

**Description:** Create a new topic (Teacher and SuperAdmin only).

**Request Body:**
```json
{
  "topic_name": "String Manipulation",
  "slug": "string-manipulation",
  "description": "String processing algorithms"
}
```

**Response:**
```json
{
  "message": "Topic created successfully",
  "topic": {
    "id": 2,
    "topic_name": "String Manipulation",
    "slug": "string-manipulation",
    "description": "String processing algorithms"
  }
}
```

#### 5. Update Topic (Teacher+)
**Endpoint:** `PATCH /api/admin/topics/:id`

**Description:** Update an existing topic (Teacher and SuperAdmin only).

**Path Parameters:**
- `id`: Topic ID

**Request Body:**
```json
{
  "topic_name": "Advanced String Manipulation",
  "description": "Advanced string processing algorithms"
}
```

**Response:**
```json
{
  "message": "Topic updated successfully",
  "topic": {
    "id": 1,
    "topic_name": "Advanced String Manipulation",
    "slug": "string-manipulation",
    "description": "Advanced string processing algorithms",
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

#### 6. Delete Topic (Teacher+)
**Endpoint:** `DELETE /api/admin/topics/:id`

**Description:** Delete a topic (Teacher and SuperAdmin only).

**Path Parameters:**
- `id`: Topic ID

**Response:**
```json
{
  "message": "Topic deleted successfully"
}
```

#### 7. Get Questions
**Endpoint:** `GET /api/admin/questions`

**Description:** Get all questions with optional filters.

**Query Parameters (Optional):**
- `level`: Filter by difficulty (EASY, MEDIUM, HARD)
- `platform`: Filter by platform (LEETCODE, GFG, CODESTUDIO)
- `topic_id`: Filter by topic ID
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "questions": [
    {
      "id": 1,
      "question_name": "Two Sum",
      "level": "EASY",
      "platform": "LEETCODE",
      "platform_question_id": "1",
      "link": "https://leetcode.com/problems/two-sum/",
      "topic": {
        "id": 1,
        "topic_name": "Arrays",
        "slug": "arrays"
      },
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### 8. Create Question (Teacher+)
**Endpoint:** `POST /api/admin/questions`

**Description:** Create a new question (Teacher and SuperAdmin only).

**Request Body:**
```json
{
  "question_name": "Three Sum",
  "level": "MEDIUM",
  "platform": "LEETCODE",
  "platform_question_id": "15",
  "link": "https://leetcode.com/problems/3sum/",
  "topic_id": 1
}
```

**Response:**
```json
{
  "message": "Question created successfully",
  "question": {
    "id": 2,
    "question_name": "Three Sum",
    "level": "MEDIUM",
    "platform": "LEETCODE",
    "platform_question_id": "15",
    "link": "https://leetcode.com/problems/3sum/",
    "topic_id": 1,
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}
```

#### 9. Update Question (Teacher+)
**Endpoint:** `PATCH /api/admin/questions/:id`

**Description:** Update an existing question (Teacher and SuperAdmin only).

**Path Parameters:**
- `id`: Question ID

**Request Body:**
```json
{
  "question_name": "Updated Three Sum",
  "level": "HARD",
  "link": "https://leetcode.com/problems/3sum/"
}
```

**Response:**
```json
{
  "message": "Question updated successfully",
  "question": {
    "id": 2,
    "question_name": "Updated Three Sum",
    "level": "HARD",
    "platform": "LEETCODE",
    "platform_question_id": "15",
    "link": "https://leetcode.com/problems/3sum/",
    "topic_id": 1,
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

#### 10. Delete Question (Teacher+)
**Endpoint:** `DELETE /api/admin/questions/:id`

**Description:** Delete a question (Teacher and SuperAdmin only).

**Path Parameters:**
- `id`: Question ID

**Response:**
```json
{
  "message": "Question deleted successfully"
}
```

#### 11. Bulk Upload Questions (Teacher+)
**Endpoint:** `POST /api/admin/questions/bulk-upload`

**Description:** Upload multiple questions via CSV file (Teacher and SuperAdmin only).

**Request:** `multipart/form-data`
- `file`: CSV file with questions data

**CSV Format:**
```csv
question_name,level,platform,platform_question_id,link,topic_slug
Two Sum,EASY,LEETCODE,1,https://leetcode.com/problems/two-sum/,arrays
```

**Response:**
```json
{
  "message": "Questions uploaded successfully",
  "results": {
    "totalProcessed": 10,
    "successCount": 8,
    "failureCount": 2,
    "failures": [
      {
        "row": 3,
        "error": "Invalid topic slug"
      },
      {
        "row": 7,
        "error": "Duplicate platform question ID"
      }
    ]
  }
}
```

#### 12. Get Admin Stats
**Endpoint:** `POST /api/admin/stats`

**Description:** Get comprehensive admin statistics.

**Request Body:**
```json
{
  "batch_id": 1,
  "city_id": 1
}
```

**Response:**
```json
{
  "stats": {
    "totalStudents": 150,
    "activeStudents": 120,
    "totalQuestions": 500,
    "averageProgress": 65.5,
    "topPerformers": [
      {
        "student_id": 1,
        "name": "John Doe",
        "totalSolved": 245,
        "completionPercentage": 85.2
      }
    ],
    "batchStats": {
      "totalStudents": 150,
      "averageProgress": 65.5,
      "easyCompletion": 75.3,
      "mediumCompletion": 60.8,
      "hardCompletion": 45.2
    }
  }
}
```

#### 13. Get Admin Leaderboard
**Endpoint:** `POST /api/admin/leaderboard`

**Description:** Get admin leaderboard with pagination and search.

**Request Body:**
```json
{
  "city": "all|city_name",
  "type": "weekly|monthly|all",
  "year": 2024,
  "page": 1,
  "limit": 20,
  "search": "john"
}
```

**Filters:**
- `city`: "all" for global, or specific city name
- `type`: "weekly", "monthly", or "all"
- `year`: Batch year filter
- `page`: Page number
- `limit`: Items per page
- `search`: Search by student name or username

**Response:**
```json
{
  "leaderboard": [
    {
      "student_id": 1,
      "name": "John Doe",
      "username": "johndoe",
      "batch_year": 2024,
      "city_name": "New York",
      "max_streak": 5,
      "easy_solved": 85.5,
      "medium_solved": 72.3,
      "hard_solved": 45.8,
      "total_solved": 67.87,
      "rank": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### 14. Get Students
**Endpoint:** `GET /api/admin/students`

**Description:** Get all students with optional filters.

**Query Parameters (Optional):**
- `batch_id`: Filter by batch ID
- `city_id`: Filter by city ID
- `search`: Search by name or username
- `page`: Page number
- `limit`: Items per page

**Example:** `GET /api/admin/students?batch_id=1&search=john&page=1&limit=20`

**Response:**
```json
{
  "students": [
    {
      "id": 1,
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "enrollment_id": "ENR123",
      "batch": {
        "id": 1,
        "batch_name": "Batch 2024",
        "year": 2024
      },
      "city": {
        "id": 1,
        "city_name": "New York"
      },
      "leetcode_id": "john123",
      "gfg_id": "john456",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### 15. Create Student (Teacher+)
**Endpoint:** `POST /api/admin/students`

**Description:** Create a new student (Teacher and SuperAdmin only).

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "username": "janesmith",
  "password": "password123",
  "batch_id": 1,
  "leetcode_id": "jane456",
  "gfg_id": "jane789",
  "github": "janesmith",
  "linkedin": "https://linkedin.com/in/janesmith",
  "enrollment_id": "ENR456"
}
```

**Response:**
```json
{
  "message": "Student created successfully",
  "student": {
    "id": 2,
    "name": "Jane Smith",
    "email": "jane@example.com",
    "username": "janesmith",
    "batch_id": 1,
    "city_id": 1,
    "leetcode_id": "jane456",
    "gfg_id": "jane789",
    "github": "janesmith",
    "linkedin": "https://linkedin.com/in/janesmith",
    "enrollment_id": "ENR456",
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}
```

#### 16. Update Student (Teacher+)
**Endpoint:** `PATCH /api/admin/students/:id`

**Description:** Update student details (Teacher and SuperAdmin only).

**Path Parameters:**
- `id`: Student ID

**Request Body:**
```json
{
  "name": "Jane Updated",
  "email": "jane.updated@example.com",
  "github": "janeupdated",
  "linkedin": "https://linkedin.com/in/janeupdated"
}
```

**Response:**
```json
{
  "message": "Student updated successfully",
  "student": {
    "id": 2,
    "name": "Jane Updated",
    "email": "jane.updated@example.com",
    "username": "janesmith",
    "batch_id": 1,
    "city_id": 1,
    "leetcode_id": "jane456",
    "gfg_id": "jane789",
    "github": "janeupdated",
    "linkedin": "https://linkedin.com/in/janeupdated",
    "enrollment_id": "ENR456",
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

#### 17. Delete Student (Teacher+)
**Endpoint:** `DELETE /api/admin/students/:id`

**Description:** Delete a student (Teacher and SuperAdmin only).

**Path Parameters:**
- `id`: Student ID

**Response:**
```json
{
  "message": "Student deleted successfully"
}
```

#### 18. Add Student Progress (Teacher+)
**Endpoint:** `POST /api/admin/students/progress`

**Description:** Manually add/update student progress (Teacher and SuperAdmin only).

**Request Body:**
```json
{
  "student_id": 1,
  "question_id": 1,
  "status": "SOLVED",
  "solved_at": "2024-01-01T10:00:00.000Z"
}
```

**Response:**
```json
{
  "message": "Student progress updated successfully",
  "progress": {
    "id": 123,
    "student_id": 1,
    "question_id": 1,
    "status": "SOLVED",
    "solved_at": "2024-01-01T10:00:00.000Z",
    "sync_at": "2024-01-01T10:00:00.000Z"
  }
}
```

#### 19. Manual Sync Student
**Endpoint:** `POST /api/admin/students/sync/:id`

**Description:** Manually sync student progress from external platforms.

**Path Parameters:**
- `id`: Student ID

**Response:**
```json
{
  "message": "Student sync completed successfully",
  "results": {
    "leetcode": {
      "synced": 15,
      "updated": 12,
      "failed": 3
    },
    "gfg": {
      "synced": 10,
      "updated": 8,
      "failed": 2
    },
    "totalProgress": 25
  }
}
```

#### 20. Bulk Student Upload
**Endpoint:** `POST /api/admin/bulk-operations`

**Description:** Bulk upload students via CSV file.

**Request:** `multipart/form-data`
- `file`: CSV file with student data

**CSV Format:**
```csv
name,email,username,password,batch_id,leetcode_id,gfg_id,github,linkedin,enrollment_id
John Doe,john@example.com,johndoe,password123,1,john123,john456,johndoe,https://linkedin.com/in/johndoe,ENR123
```

**Response:**
```json
{
  "message": "Students uploaded successfully",
  "results": {
    "totalProcessed": 50,
    "successCount": 45,
    "failureCount": 5,
    "failures": [
      {
        "row": 3,
        "error": "Email already exists"
      },
      {
        "row": 7,
        "error": "Invalid batch ID"
      }
    ]
  }
}
```

#### 21. Download Batch Report
**Endpoint:** `POST /api/admin/student/reportdownload`

**Description:** Download batch report in CSV format.

**Request Body:**
```json
{
  "batch_id": 1,
  "format": "csv"
}
```

**Response:** CSV file download with headers:
```
Content-Type: text/csv
Content-Disposition: attachment; filename="batch_report_2024-01-01.csv"
```

**CSV Content:**
```csv
student_id,name,email,username,total_solved,easy_solved,medium_solved,hard_solved,completion_percentage
1,John Doe,john@example.com,johndoe,245,118,104,21,65.5
2,Jane Smith,jane@example.com,janesmith,189,95,72,22,50.8
```

#### 22. Batch-Specific Routes

All routes below require `batchSlug` parameter and valid batch context.

##### 22.1 Get Topics for Batch
**Endpoint:** `GET /api/admin/:batchSlug/topics`

**Description:** Get all topics for a specific batch.

**Path Parameters:**
- `batchSlug`: Batch slug (e.g., "batch-2024")

**Response:**
```json
{
  "topics": [
    {
      "id": 1,
      "topic_name": "Arrays",
      "slug": "arrays",
      "description": "Array data structures and algorithms",
      "classes_count": 5,
      "total_questions": 50,
      "assigned_questions": 45
    }
  ]
}
```

##### 22.2 Get Classes by Topic
**Endpoint:** `GET /api/admin/:batchSlug/topics/:topicSlug/classes`

**Description:** Get all classes under a topic for a specific batch.

**Path Parameters:**
- `batchSlug`: Batch slug
- `topicSlug`: Topic slug

**Response:**
```json
{
  "classes": [
    {
      "id": 1,
      "class_name": "Basic Arrays",
      "slug": "basic-arrays",
      "duration": "2 hours",
      "description": "Introduction to arrays",
      "assigned_questions": 10,
      "total_students": 150
    }
  ]
}
```

##### 22.3 Create Class in Topic (Teacher+)
**Endpoint:** `POST /api/admin/:batchSlug/topics/:topicSlug/classes`

**Description:** Create a new class under a topic (Teacher and SuperAdmin only).

**Request Body:**
```json
{
  "class_name": "Advanced Arrays",
  "description": "Advanced array algorithms",
  "pdf_url": "https://example.com/class-material.pdf",
  "duration_minutes": 180,
  "class_date": "2024-01-15T10:00:00.000Z"
}
```

**Response:**
```json
{
  "message": "Class created successfully",
  "class": {
    "id": 2,
    "class_name": "Advanced Arrays",
    "slug": "advanced-arrays",
    "description": "Advanced array algorithms",
    "pdf_url": "https://example.com/class-material.pdf",
    "duration_minutes": 180,
    "class_date": "2024-01-15T10:00:00.000Z",
    "topic_id": 1,
    "batch_id": 1,
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}
```

##### 22.4 Get Class Details
**Endpoint:** `GET /api/admin/:batchSlug/topics/:topicSlug/classes/:classSlug`

**Description:** Get detailed class information.

**Path Parameters:**
- `batchSlug`: Batch slug
- `topicSlug`: Topic slug
- `classSlug`: Class slug

**Response:**
```json
{
  "id": 1,
  "class_name": "Basic Arrays",
  "slug": "basic-arrays",
  "description": "Introduction to arrays",
  "pdf_url": "https://example.com/class.pdf",
  "duration_minutes": 120,
  "class_date": "2024-01-01T10:00:00.000Z",
  "created_at": "2024-01-01T09:00:00.000Z",
  "topic_id": 1,
  "batch_id": 1,
  "questionCount": 10
}
```

##### 22.5 Update Class (Teacher+)
**Endpoint:** `PATCH /api/admin/:batchSlug/topics/:topicSlug/classes/:classSlug`

**Description:** Update class details (Teacher and SuperAdmin only).

**Path Parameters:**
- `batchSlug`: Batch slug
- `topicSlug`: Topic slug
- `classSlug`: Class slug

**Request Body:**
```json
{
  "class_name": "Updated Basic Arrays",
  "duration_minutes": 150,
  "description": "Updated introduction to arrays"
}
```

**Response:**
```json
{
  "message": "Class updated successfully",
  "class": {
    "id": 1,
    "class_name": "Updated Basic Arrays",
    "slug": "basic-arrays",
    "description": "Updated introduction to arrays",
    "duration_minutes": 150,
    "pdf_url": "https://example.com/class.pdf",
    "class_date": "2024-01-01T10:00:00.000Z",
    "topic_id": 1,
    "batch_id": 1,
    "created_at": "2024-01-01T09:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

##### 22.6 Delete Class (Teacher+)
**Endpoint:** `DELETE /api/admin/:batchSlug/topics/:topicSlug/classes/:classSlug`

**Description:** Delete a class (Teacher and SuperAdmin only).

**Path Parameters:**
- `batchSlug`: Batch slug
- `topicSlug`: Topic slug
- `classSlug`: Class slug

**Response:**
```json
{
  "message": "Class deleted successfully"
}
```

##### 22.7 Assign Questions to Class (Teacher+)
**Endpoint:** `POST /api/admin/:batchSlug/topics/:topicSlug/classes/:classSlug/questions`

**Description:** Assign questions to a class (Teacher and SuperAdmin only).

**Request Body:**
```json
{
  "question_ids": [1, 2, 3, 4, 5]
}
```

**Response:**
```json
{
  "message": "Questions assigned successfully",
  "assignedCount": 5
}
```

##### 22.8 Get Assigned Questions of Class
**Endpoint:** `GET /api/admin/:batchSlug/topics/:topicSlug/classes/:classSlug/questions`

**Description:** Get all questions assigned to a class.

**Path Parameters:**
- `batchSlug`: Batch slug
- `topicSlug`: Topic slug
- `classSlug`: Class slug

**Query Parameters (Optional):**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "message": "Assigned questions retrieved successfully",
  "data": [
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
      "assigned_at": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

#### 23. Test External Platform Sync

##### 23.1 Test LeetCode Sync
**Endpoint:** `GET /api/admin/test/leetcode/:username`

**Description:** Test LeetCode data synchronization for a username.

**Path Parameters:**
- `username`: LeetCode username to test

**Response:**
```json
{
  "totalSolved": 245,
  "easySolved": 118,
  "mediumSolved": 104,
  "hardSolved": 21,
  "recentSubmissions": [
    {
      "title": "Two Sum",
      "difficulty": "Easy",
      "timestamp": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

##### 23.2 Test GFG Sync
**Endpoint:** `GET /api/admin/test/gfg/:username`

**Description:** Test GeeksforGeeks data synchronization for a username.

**Path Parameters:**
- `username`: GFG username to test

**Response:**
```json
{
  "totalSolved": 189,
  "schoolProblemsSolved": 95,
  "basicProblemsSolved": 72,
  "mediumProblemsSolved": 22,
  "hardProblemsSolved": 0,
  "recentSubmissions": [
    {
      "problemName": "Array Reverse",
      "difficulty": "Basic",
      "timestamp": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

---

## SuperAdmin APIs

### Base URL: `/api/superadmin`

All SuperAdmin endpoints require **authentication + SUPERADMIN role**.

#### 1. City Management

##### 1.1 Create City
**Endpoint:** `POST /api/superadmin/cities`

**Description:** Create a new city.

**Request Body:**
```json
{
  "city_name": "Boston"
}
```

**Response:**
```json
{
  "message": "City created successfully",
  "city": {
    "id": 2,
    "city_name": "Boston",
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}
```

##### 1.2 Get All Cities
**Endpoint:** `GET /api/superadmin/cities`

**Description:** Get all cities.

**Response:**
```json
{
  "cities": [
    {
      "id": 1,
      "city_name": "New York",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "city_name": "Boston",
      "created_at": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

##### 1.3 Delete City
**Endpoint:** `DELETE /api/superadmin/cities/:id`

**Description:** Delete a city.

**Path Parameters:**
- `id`: City ID

**Response:**
```json
{
  "message": "City deleted successfully"
}
```

#### 2. Batch Management

##### 2.1 Create Batch
**Endpoint:** `POST /api/superadmin/batches`

**Description:** Create a new batch.

**Request Body:**
```json
{
  "batch_name": "Batch 2025",
  "slug": "batch-2025",
  "year": 2025,
  "city_id": 1,
  "easy_assigned": 250,
  "medium_assigned": 400,
  "hard_assigned": 150
}
```

**Response:**
```json
{
  "message": "Batch created successfully",
  "batch": {
    "id": 2,
    "batch_name": "Batch 2025",
    "slug": "batch-2025",
    "year": 2025,
    "city_id": 1,
    "easy_assigned": 250,
    "medium_assigned": 400,
    "hard_assigned": 150,
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}
```

##### 2.2 Get All Batches
**Endpoint:** `GET /api/superadmin/batches`

**Description:** Get all batches.

**Response:**
```json
{
  "batches": [
    {
      "id": 1,
      "batch_name": "Batch 2024",
      "slug": "batch-2024",
      "year": 2024,
      "city_id": 1,
      "city": {
        "city_name": "New York"
      },
      "easy_assigned": 215,
      "medium_assigned": 388,
      "hard_assigned": 138,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

##### 2.3 Update Batch
**Endpoint:** `PATCH /api/superadmin/batches/:id`

**Description:** Update batch details.

**Path Parameters:**
- `id`: Batch ID

**Request Body:**
```json
{
  "batch_name": "Updated Batch 2024",
  "easy_assigned": 220,
  "medium_assigned": 390
}
```

**Response:**
```json
{
  "message": "Batch updated successfully",
  "batch": {
    "id": 1,
    "batch_name": "Updated Batch 2024",
    "slug": "batch-2024",
    "year": 2024,
    "city_id": 1,
    "easy_assigned": 220,
    "medium_assigned": 390,
    "hard_assigned": 138,
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

##### 2.4 Delete Batch
**Endpoint:** `DELETE /api/superadmin/batches/:id`

**Description:** Delete a batch.

**Path Parameters:**
- `id`: Batch ID

**Response:**
```json
{
  "message": "Batch deleted successfully"
}
```

#### 3. Admin Management

##### 3.1 Create Admin
**Endpoint:** `POST /api/superadmin/admins`

**Description:** Create a new admin (SuperAdmin only).

**Request Body:**
```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "password123",
  "role": "TEACHER|INTERN",
  "batch_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin created successfully",
  "data": {
    "id": 2,
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "TEACHER",
    "batch_id": 1,
    "city_id": 1,
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}
```

##### 3.2 Get All Admins
**Endpoint:** `GET /api/superadmin/admins`

**Description:** Get all admins with optional filters (defaults to TEACHER role only).

**Query Parameters (Optional):**
- `role`: Filter by role (TEACHER, INTERN) - defaults to TEACHER
- `batch_id`: Filter by batch ID
- `city_id`: Filter by city ID
- `search`: Search by name or username

**Example:** `GET /api/superadmin/admins?role=TEACHER&batch_id=1`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Admin",
      "email": "john.admin@example.com",
      "role": "TEACHER",
      "batch": {
        "id": 1,
        "batch_name": "Batch 2024",
        "year": 2024
      },
      "city": {
        "id": 1,
        "city_name": "New York"
      },
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

##### 3.3 Update Admin
**Endpoint:** `PATCH /api/superadmin/admins/:id`

**Description:** Update admin details (only role and batch_id allowed for SuperAdmin).

**Path Parameters:**
- `id`: Admin ID

**Request Body:**
```json
{
  "role": "TEACHER",
  "batch_id": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin updated successfully",
  "data": {
    "id": 1,
    "name": "John Admin",
    "email": "john.admin@example.com",
    "role": "TEACHER",
    "batch_id": 2,
    "city_id": 1,
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

##### 3.4 Delete Admin
**Endpoint:** `DELETE /api/superadmin/admins/:id`

**Description:** Delete an admin.

**Path Parameters:**
- `id`: Admin ID

**Response:**
```json
{
  "success": true,
  "message": "Admin deleted successfully"
}
```

#### 4. System Statistics

##### 4.1 Get System Stats
**Endpoint:** `GET /api/superadmin/stats`

**Description:** Get comprehensive system statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCities": 10,
    "totalBatches": 25,
    "totalStudents": 2500,
    "totalAdmins": 50,
    "totalQuestions": 1000,
    "totalTopics": 20
  }
}
```

---

## Health Check

#### System Health
**Endpoint:** `GET /health`

**Description:** Check system health and status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

## S3 APIs

### Base URL: `/api/s3`

All S3 endpoints are **public** and used for file management operations.

#### 1. Test S3 Connection
**Endpoint:** `GET /api/s3/test`

**Description:** Test S3 configuration and connectivity.

**Response:**
```json
{
  "message": "S3 connection successful",
  "bucket": "your-bucket-name",
  "region": "us-east-1"
}
```

#### 2. Upload Test File
**Endpoint:** `POST /api/s3/upload`

**Description:** Upload a test file to S3 (for testing purposes).

**Request:** `multipart/form-data`
- `file`: File to upload

**Response:**
```json
{
  "message": "File uploaded successfully",
  "fileUrl": "https://s3.amazonaws.com/bucket/path/to/file",
  "fileName": "test-file.jpg"
}
```

---

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

**Common Error Examples:**

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "Email is required"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required",
  "details": "Invalid or missing access token"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions",
  "details": "User role does not have access to this resource"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found",
  "details": "Student with ID 999 does not exist"
}
```

#### 409 Conflict
```json
{
  "success": false,
  "error": "Resource already exists",
  "details": "Email already registered"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "details": "Database connection failed"
}
```

### Pagination Response
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Error Handling

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists
- **500 Internal Server Error**: Server error

### Common Error Messages

- `"Authentication required"`: Missing or invalid token
- `"Insufficient permissions"`: User doesn't have required role
- `"Student not found"`: Student resource not found
- `"Admin not found"`: Admin resource not found
- `"Email already exists"`: Email already registered
- `"Username already exists"`: Username already taken
- `"Invalid credentials"`: Incorrect login details

---

## Authentication Flow

1. **Login**: Use `/api/auth/student/login` or `/api/auth/admin/login` to get tokens
2. **Store Tokens**: Save access and refresh tokens securely
3. **Make Authenticated Requests**: Include access token in `Authorization: Bearer <token>` header
4. **Token Refresh**: Implement refresh token logic when access token expires
5. **Logout**: Call respective logout endpoint to invalidate tokens

---

## Rate Limiting & Best Practices

1. **Token Management**: Refresh tokens before they expire
2. **Error Handling**: Implement proper error handling for all API calls
3. **Pagination**: Use pagination for large datasets
4. **Filtering**: Use available filters to reduce data transfer
5. **File Uploads**: Use appropriate file formats and size limits
6. **Security**: Never expose sensitive information in frontend code

---

## Testing Endpoints

Use tools like Postman, curl, or Swagger UI (`/api-docs`) to test endpoints:

```bash
# Example: Login as student
curl -X POST http://localhost:5000/api/auth/student/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'

# Example: Get student profile
curl -X GET http://localhost:5000/api/students/profile \
  -H "Authorization: Bearer <access_token>"
```

---

## Additional Information

### Interactive API Documentation

The API provides an interactive Swagger UI for testing all endpoints:

**Swagger UI:** `GET /api-docs`

Visit `http://localhost:5000/api-docs` in your browser to access the interactive API documentation where you can test all endpoints directly.

### CSV Upload Interface

A web interface is available for CSV upload operations:

**CSV UI:** `GET /csv-ui`

Visit `http://localhost:5000/csv-ui` to access the CSV upload interface for bulk operations.

### Base URL

All API endpoints are prefixed with the base URL:
- **Development:** `http://localhost:5000`
- **Production:** `https://your-domain.com`

### Rate Limiting

The API implements rate limiting on sensitive endpoints:
- **Authentication endpoints:** Limited to prevent brute force attacks
- **Password reset endpoints:** Limited with OTP restrictions
- **General API usage:** Standard rate limiting applies

### File Upload Limits

- **Maximum file size:** 10MB for CSV uploads
- **Supported image formats:** JPEG, PNG, GIF for profile images
- **Supported CSV formats:** UTF-8 encoded CSV files

### CORS Configuration

The API is configured to accept requests from:
- `http://localhost:5000`
- `http://127.0.0.1:5500`
- `http://127.0.0.1:5501`
- `http://localhost:5501`

---

## Notes

- All timestamps are in UTC format
- All IDs are integers
- Boolean values are `true`/`false`
- Null values are represented as `null` in JSON
- File uploads use `multipart/form-data`
- All datetime fields follow ISO 8601 format
- Pagination starts from page 1
- Search is case-insensitive where applicable
