# 🎨 DSA Tracker Admin Panel - Premium UI Design

> **Enterprise-grade admin interface with modern design patterns**  
> **Framework**: Next.js App Router + TypeScript + TailwindCSS  
> **Design System**: Material Design 3.0 + Custom Components  
> **Last Updated**: March 2025

---

## 🔐 Authentication & Token Structure

### **Admin Login Response**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 456,
    "name": "Admin User",
    "email": "admin@example.com",
    "username": "admin",
    "role": "TEACHER"
  }
}
```

### **JWT Token Payload (Decoded)**
```json
{
  "id": 456,
  "email": "admin@example.com",
  "role": "TEACHER",
  "userType": "admin",
  "iat": 1641234567,
  "exp": 1641849367
}
```

### **Future Admin Token (After Migration)**
```json
{
  "id": 456,
  "email": "admin@example.com",
  "role": "TEACHER",
  "userType": "admin",
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
// Current: Explicit batch selection
const { data } = await api.get('/admin/batch-sot-2025/topics');

// Future: Default batch filtering
const { data } = await api.get('/admin/dashboard');
// Automatically uses admin's default batch from token

// Batch switching
const switchBatch = (batchSlug: string) => {
  api.get(`/admin/${batchSlug}/topics`);
};
```

---

## 🎯 Design Philosophy

### **Modern & Professional**
- Clean, minimalist interface with thoughtful micro-interactions
- Consistent spacing, typography, and color system
- Accessibility-first design with WCAG 2.1 compliance

### **Data-Driven**
- Real-time updates with smooth transitions
- Comprehensive data visualization
- Intelligent filtering and search capabilities

### **User Experience**
- Intuitive navigation patterns
- Responsive design for all devices
- Performance optimized with lazy loading

---

## 📋 Table of Contents

### 🏠 Authentication Pages
- Login Page
- Register Page (SuperAdmin only)

### 🎯 Main Application Pages
- Dashboard
- Topics Management
- Topic Detail & Classes
- Class Detail & Questions
- Questions Library
- Students Management
- Student Report

---

## 🔐 Authentication Pages

### 1️⃣ Login Page
**Route**: `/admin/login`

**UI Components**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                      🚀 DSA TRACKER ADMIN                                 │
│                 ════════════════════════════════════════════════            │
│                                                                             │
│                                                                             │
│    ┌─────────────────────────────────────────────────────────────────────┐   │
│    │                        🎯 Welcome Back!                        │   │
│    │                                                             │   │
│    │  Sign in to access your admin dashboard and manage students      │   │
│    │                                                             │   │
│    │  ┌─────────────────────────────────────────────────────────┐   │   │
│    │  │ 📧 Email Address                                       │   │   │
│    │  │ ┌─────────────────────────────────────────────────────┐ │   │   │
│    │  │ │ admin@example.com                              │ │   │   │
│    │  │ └─────────────────────────────────────────────────────┘ │   │   │
│    │  │                                                     │   │   │
│    │  │ 🔒 Password                                          │   │   │
│    │  │ ┌─────────────────────────────────────────────────────┐ │   │   │
│    │  │ │ ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••• │ │   │   │
│    │  │ └─────────────────────────────────────────────────────┘ │   │   │
│    │  │                                                     │   │   │
│    │  │ ☑️ Remember me    🔗 Forgot password?               │   │   │
│    │  │                                                     │   │   │
│    │  │ ┌─────────────────────────────────────────────────────┐ │   │   │
│    │  │ │           🚀 Sign In to Dashboard                │ │   │   │
│    │  │ └─────────────────────────────────────────────────────┘ │   │   │
│    │  │                                                     │   │   │
│    │  │  ──────────────────────────────────────────────────  │   │   │
│    │  │                                                     │   │   │
│    │  │  Don't have an account? 📝 Register as Admin       │   │   │
│    │  │                                                     │   │   │
│    │  └─────────────────────────────────────────────────────────┘   │
│    │                                                             │   │
│    └─────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  🔐 Secure Login • 🛡️ Encrypted • ⚡ Instant Access                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 🎨 Premium Login Features

#### **Visual Design**
- **Gradient Background**: Modern gradient with subtle animations
- **Glass Morphism**: Frosted glass effect on form container
- **Floating Labels**: Material Design 3.0 input fields
- **Smooth Transitions**: 300ms ease-in-out animations

#### **User Experience**
- **Auto-focus**: Email field automatically focused on load
- **Show/Hide Password**: Toggle password visibility
- **Form Validation**: Real-time validation with helpful messages
- **Loading States**: Button shows spinner during authentication

#### **Security Features**
- **Session Management**: Secure token handling
- **Rate Limiting**: Prevent brute force attacks
- **Remember Me**: Persistent session option
- **Auto-logout**: Inactivity timeout

**Form Fields**:
- `email` (email) - Admin email address
- `password` (password) - Admin password

**API Used**:
```http
POST /api/auth/admin-login
```

**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Success Response (200)**:
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Admin Name",
    "email": "admin@example.com",
    "username": "admin123",
    "role": "SUPERADMIN"
  }
}
```

**Error Response (401)**:
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

### 2️⃣ Register Page (SuperAdmin Only)
**Route**: `/admin/register`

**UI Components**:
```
┌─────────────────────────────────────┐
│         Create Admin Account        │
├─────────────────────────────────────┤
│                                     │
│    ┌─────────────────────────────┐   │
│    │       Registration Form     │   │
│    │                             │   │
│    │ Name: [_______________]     │   │
│    │                             │   │
│    │ Email: [_______________]    │   │
│    │                             │   │
│    │ Username: [_______________] │   │
│    │                             │   │
│    │ Password: [_______________] │   │
│    │                             │   │
│    │ Role: [SuperAdmin ▼]       │   │
│    │                             │   │
│    │   [  Create Account  ]      │   │
│    └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Form Fields**:
- `name` (text) - Full name
- `email` (email) - Email address
- `username` (text) - Unique username
- `password` (password) - Password
- `role` (select) - SUPERADMIN | TEACHER | INTERN

**API Used**:
```http
POST /api/auth/admin-register
```

**Request Body**:
```json
{
  "name": "Teacher Name",
  "email": "teacher@example.com",
  "username": "teacher123",
  "password": "password123",
  "role": "TEACHER"
}
```

**Success Response (201)**:
```json
{
  "message": "Admin registered successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "name": "Teacher Name",
    "email": "teacher@example.com",
    "username": "teacher123",
    "role": "TEACHER"
  }
}
```

---

## 🏠 Main Application Layout

### 🏢 Premium Global Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ══════════════════════════════════════════════════════════════════════════ │
│  🚀 DSA Tracker Admin                                    🔔 [3] 👤 Admin │
│  ══════════════════════════════════════════════════════════════════════════ │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 📍 Workspace: [Bangalore ▼] 📚 Batch: [SOT 2025 ▼] 🔄 📊 ⚙️ 🚪 │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 🏠 Dashboard │ 📚 Topics │ ❓ Questions │ 👥 Students │ 📈 Analytics │ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  � Breadcrumb: Home > Dashboard                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                     │ │
│  │                        MAIN CONTENT AREA                            │ │
│  │                                                                     │ │
│  │  [Dynamic page content with smooth transitions]                     │ │
│  │                                                                     │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  🦊 2025 DSA Tracker Admin v2.0 │ 🌐 EN │ ⚡ Real-time │ 📊 45ms │      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 🎨 Premium Design Features

#### **Header Components**
- **Brand Identity**: Modern logo with gradient effect
- **Notification Center**: Real-time alerts with badge counter
- **User Profile**: Avatar with dropdown menu
- **Workspace Selector**: Elegant city/batch dropdowns with search

#### **Navigation System**
- **Primary Navigation**: Tab-based navigation with active indicators
- **Breadcrumb Trail**: Clear navigation path
- **Quick Actions**: Refresh, analytics, settings buttons
- **Keyboard Shortcuts**: Accessible hotkeys for power users

#### **Visual Enhancements**
- **Glass Morphism**: Subtle blur effects and transparency
- **Smooth Animations**: 300ms transitions with easing
- **Dark Mode Support**: Complete theme system
- **Loading States**: Skeleton loaders and progress indicators

#### **Responsive Design**
- **Mobile First**: Optimized for all screen sizes
- **Touch Gestures**: Swipe navigation and pull-to-refresh
- **Adaptive Layout**: Content reflows intelligently
- **Performance**: Lazy loading and code splitting

**Header APIs**:
```http
GET /api/admin/cities
GET /api/admin/batches
```

**Cities Response**:
```json
{
  "cities": [
    {
      "id": 1,
      "city_name": "Mumbai",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "city_name": "Bangalore",
      "created_at": "2025-01-02T00:00:00.000Z",
      "updated_at": "2025-01-02T00:00:00.000Z"
    }
  ]
}
```

**Batches Response**:
```json
{
  "batches": [
    {
      "id": 1,
      "batch_name": "SOT 2025",
      "year": 2025,
      "city_id": 2,
      "slug": "bangalore-sot-2025",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z",
      "city": {
        "id": 2,
        "city_name": "Bangalore"
      }
    }
  ]
}
```

---

## 📊 1️⃣ Dashboard Page

**Route**: `/admin/dashboard`

**API Used**:
```http
GET /api/admin/dashboard
```

**Dashboard Response**:
```json
{
  "success": true,
  "message": "Dashboard data retrieved successfully",
  "timestamp": "2025-03-05T20:30:00.000Z",
  "data": {
    "workspace": {
      "city": {
        "id": 2,
        "city_name": "Bangalore",
        "timezone": "Asia/Kolkata",
        "active_students": 28
      },
      "batch": {
        "id": 1,
        "batch_name": "SOT 2025",
        "slug": "bangalore-sot-2025",
        "year": 2025,
        "start_date": "2025-01-15",
        "end_date": "2025-06-30",
        "status": "ACTIVE",
        "progress": 42
      }
    },
    "overview": {
      "totalTopics": 8,
      "totalClasses": 24,
      "totalQuestions": 156,
      "totalStudents": 45,
      "completionRate": 68.5,
      "averageProgress": 34.6
    },
    "analytics": {
      "questionsByLevel": {
        "easy": { "count": 65, "percentage": 41.7, "color": "#10b981" },
        "medium": { "count": 71, "percentage": 45.5, "color": "#f59e0b" },
        "hard": { "count": 20, "percentage": 12.8, "color": "#ef4444" }
      },
      "questionsByPlatform": {
        "leetcode": { "count": 89, "percentage": 57.1, "icon": "💻" },
        "gfg": { "count": 45, "percentage": 28.8, "icon": "📚" },
        "interviewbit": { "count": 15, "percentage": 9.6, "icon": "🎯" },
        "other": { "count": 7, "percentage": 4.5, "icon": "📝" }
      },
      "studentActivity": {
        "activeToday": 12,
        "activeThisWeek": 38,
        "recentRegistrations": 5,
        "avgSolvedPerStudent": 34.6,
        "topPerformers": [
          {
            "username": "dhruv_dev",
            "name": "Dhruv Narang",
            "solved": 45,
            "streak": 7
          },
          {
            "username": "jane_smith",
            "name": "Jane Smith", 
            "solved": 42,
            "streak": 5
          }
        ]
      }
    },
    "recentActivity": [
      {
        "id": 1,
        "type": "question_assigned",
        "message": "5 questions assigned to Arrays - Class 1",
        "timestamp": "2025-03-05T14:15:00.000Z",
        "user": "admin_teacher",
        "priority": "normal"
      },
      {
        "id": 2,
        "type": "student_registered",
        "message": "New student John Doe joined SOT 2025",
        "timestamp": "2025-03-05T13:30:00.000Z",
        "user": "john_doe",
        "priority": "high"
      },
      {
        "id": 3,
        "type": "class_created",
        "message": "New class 'Advanced Arrays' created",
        "timestamp": "2025-03-05T11:45:00.000Z",
        "user": "admin_teacher",
        "priority": "normal"
      }
    ],
    "quickActions": [
      {
        "id": 1,
        "title": "Create Topic",
        "description": "Add new topic to curriculum",
        "icon": "📚",
        "route": "/admin/topics/create",
        "color": "#3b82f6"
      },
      {
        "id": 2,
        "title": "Add Questions",
        "description": "Bulk upload or add individual questions",
        "icon": "❓",
        "route": "/admin/questions/create",
        "color": "#8b5cf6"
      },
      {
        "id": 3,
        "title": "View Students",
        "description": "Manage student progress and reports",
        "icon": "👥",
        "route": "/admin/students",
        "color": "#10b981"
      }
    ]
  },
  "meta": {
    "lastUpdated": "2025-03-05T20:30:00.000Z",
    "cacheDuration": 300,
    "apiVersion": "v2.0"
  }
}
```

> **Note**: This API provides comprehensive dashboard data for the currently selected city/batch workspace. All fields are utilized in the UI components below.

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏠 Dashboard                                                              │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ │
│  │ 📚 Total Topics      │ │ 🏫 Total Classes    │ │ ❓ Total Questions   │ │
│  │                     │ │                     │ │                     │ │
│  │        8            │ │        24           │ │        156          │ │
│  │   +2 this week      │ │   +1 this week      │ │   +12 this week     │ │
│  └─────────────────────┴─────────────────────┴─────────────────────┘ │
│                                                                         │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ │
│  │ 👥 Total Students   │ │ 📈 Completion Rate  │ │ 🔥 Avg Progress      │ │
│  │                     │ │                     │ │                     │ │
│  │        45           │ │       68.5%         │ │       34.6          │ │
│  │   +5 this month     │ │   ▲ 2.3% vs last    │ │   ▲ 1.2 vs last     │ │
│  └─────────────────────┴─────────────────────┴─────────────────────┘ │
│                                                                         │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  ┌───────────────────────────────┐ ┌───────────────────────────────────┐ │
│  │ 📊 Questions by Difficulty     │ │ 🌐 Questions by Platform           │ │
│  ├───────────────────────────────┼───────────────────────────────────┤ │
│  │ 🟢 Easy    ████████████ 65     │ │ 💻 LeetCode   ████████████████ 89 │ │
│  │ 🟡 Medium  █████████████ 71     │ │ 📚 GFG        ██████████ 45       │ │
│  │ 🔴 Hard    ████ 20             │ │ 🎯 InterviewBit ███ 15           │ │
│  │           (41.7%) (45.5%) (12.8%)│ │ 📝 Other      ██ 7               │ │
│  └───────────────────────────────┴───────────────────────────────────┘ │
│                                                                         │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ 🚀 Quick Actions                                                    │ │
│  ├─────────────────────────────────────────────────────────────────────┤ │
│  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │ │
│  │ │ 📚 Create   │ │ ❓ Add      │ │ 👥 View     │ │ 📊 View     │     │ │
│  │ │ Topic      │ │ Questions  │ │ Students   │ │ Analytics  │     │ │
│  │ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ 🔥 Top Performers                                                   │ │
│  ├─────────────────────────────────────────────────────────────────────┤ │
│  │ 🥇 Dhruv Narang    45 solved    🔥 7 day streak    📈 +5 this week  │ │
│  │ 🥈 Jane Smith      42 solved    🔥 5 day streak    📈 +3 this week  │ │
│  │ 🥉 John Doe        38 solved    🔥 3 day streak    📈 +2 this week  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ 📋 Recent Activity (Live Updates)                                   │ │
│  ├─────────────────────────────────────────────────────────────────────┤ │
│  │ 🔴 HIGH  New student John Doe joined SOT 2025           2h ago     │ │
│  │ 📚 INFO  5 questions assigned to Arrays - Class 1      4h ago     │ │
│  │ 🎯 INFO  New class 'Advanced Arrays' created              6h ago     │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 🎨 Premium Dashboard Features

#### **Interactive Components**
- **Animated Cards**: Hover effects with smooth transitions
- **Progress Indicators**: Visual progress bars with percentages
- **Live Updates**: Real-time activity feed with WebSocket
- **Trend Indicators**: Up/down arrows with percentage changes

#### **Data Visualization**
- **Progress Bars**: Color-coded difficulty distribution
- **Sparkline Charts**: Mini trend graphs for quick insights
- **Status Badges**: Visual indicators for system health
- **Responsive Grid**: Adaptive layout for all screen sizes

#### **User Experience**
- **Micro-interactions**: Button hover states and click feedback
- **Loading States**: Skeleton loaders during data fetch
- **Error Handling**: Graceful fallbacks with retry options
- **Keyboard Navigation**: Full accessibility support

---

## 📖 2️⃣ Topics Management Page

**Route**: `/admin/topics`

**API Used**:
```http
GET /api/admin/{batchSlug}/topics
POST /api/admin/topics
PATCH /api/admin/topics/:id
DELETE /api/admin/topics/:id
```

**UI Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  Topics                                    [+ Create]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Topic        │ Classes │ Questions │ Actions    │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Arrays       │    5    │    25     │ [View][Edit][Delete] │   │
│  │ Linked Lists │    3    │    15     │ [View][Edit][Delete] │   │
│  │ Trees        │    4    │    20     │ [View][Edit][Delete] │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Create Topic Modal                   │   │
│  │                                                 │   │
│  │ Topic Name: [___________________]               │   │
│  │                                                 │   │
│  │            [  Create Topic  ]  [  Cancel  ]     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Create Topic API**:
```http
POST /api/admin/topics
```

**Request Body**:
```json
{
  "topic_name": "New Topic"
}
```

**Success Response (201)**:
```json
{
  "message": "Topic created successfully",
  "topic": {
    "id": 3,
    "topic_name": "New Topic",
    "slug": "new-topic",
    "created_at": "2025-02-01T10:30:00.000Z",
    "updated_at": "2025-02-01T10:30:00.000Z"
  }
}
```

---

## 📚 3️⃣ Topic Detail Page

**Route**: `/admin/topics/[topicSlug]`

**API Used**:
```http
GET /api/admin/{batchSlug}/topics/{topicSlug}/classes
POST /api/admin/{batchSlug}/topics/{topicSlug}/classes
```

**Classes Response**:
```json
{
  "classes": [
    {
      "id": 1,
      "class_name": "Class 1 - Introduction",
      "description": "Basic introduction to arrays",
      "pdf_url": "https://example.com/class1.pdf",
      "duration_minutes": 60,
      "class_date": "2025-02-01T10:00:00.000Z",
      "questionCount": 5,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "class_name": "Class 2 - Problem Solving",
      "description": "Advanced problem solving techniques",
      "pdf_url": "https://example.com/class2.pdf",
      "duration_minutes": 75,
      "class_date": "2025-02-03T14:00:00.000Z",
      "questionCount": 8,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "topicStats": {
    "totalClasses": 2,
    "totalQuestions": 13
  }
}
```

**UI Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  Topic: Arrays                              [+ Create Class] │
├─────────────────────────────────────────────────────────┤
│  Total Classes: 2 | Total Questions: 13                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Class Name           │ Date       │ Duration │ Actions │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Class 1 - Intro      │ Feb 1      │  60 min  │ [View][Edit][Delete] │   │
│  │ Class 2 - Problems   │ Feb 3      │  75 min  │ [View][Edit][Delete] │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Create Class Modal                   │   │
│  │                                                 │   │
│  │ Class Name: [___________________]               │   │
│  │ Description: [___________________]               │   │
│  │ PDF URL: [___________________]                   │   │
│  │ Duration (min): [_____]                         │   │
│  │ Date: [_______________]                          │   │
│  │                                                 │   │
│  │            [  Create Class  ]  [  Cancel  ]     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Create Class API**:
```http
POST /api/admin/{batchSlug}/topics/{topicSlug}/classes
```

**Request Body**:
```json
{
  "class_name": "Class 3 - Practice Session",
  "description": "Hands-on practice session",
  "pdf_url": "https://example.com/class3.pdf",
  "duration_minutes": 90,
  "class_date": "2025-02-05T16:00:00.000Z"
}
```

---

## 📋 4️⃣ Class Detail Page

**Route**: `/admin/topics/[topicSlug]/classes/[classSlug]`

**API Used**:
```http
GET /api/admin/{batchSlug}/topics/{topicSlug}/classes/{classSlug}
GET /api/admin/{batchSlug}/topics/{topicSlug}/classes/{classSlug}/questions
POST /api/admin/{batchSlug}/topics/{topicSlug}/classes/{classSlug}/questions
DELETE /api/admin/{batchSlug}/topics/{topicSlug}/classes/{classSlug}/questions/:questionId
GET /api/admin/questions
```

**Class Details Response**:
```json
{
  "class": {
    "id": 1,
    "class_name": "Class 1 - Introduction to Arrays",
    "description": "Basic introduction to arrays and their operations",
    "pdf_url": "https://example.com/class1.pdf",
    "class_notes": "Arrays are fundamental data structures that store elements of the same type in contiguous memory locations. Key concepts include indexing, traversal, and basic operations like insert, delete, and search.",
    "duration_minutes": 60,
    "class_date": "2025-02-01T10:00:00.000Z",
    "topic": {
      "id": 1,
      "topic_name": "Arrays",
      "slug": "arrays"
    },
    "batch": {
      "id": 1,
      "batch_name": "SOT 2025",
      "slug": "bangalore-sot-2025"
    },
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  }
}
```

**Assigned Questions Response**:
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
      "assigned_at": "2025-02-01T10:30:00.000Z"
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
      "assigned_at": "2025-02-01T10:30:00.000Z"
    }
  ],
  "count": 2
}
```

**Questions Library Response**:
```json
{
  "questions": [
    {
      "id": 3,
      "question_name": "Best Time to Buy and Sell Stock",
      "question_link": "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",
      "platform": "LEETCODE",
      "level": "EASY",
      "type": "HOMEWORK",
      "topic_id": 1,
      "topic": {
        "id": 1,
        "topic_name": "Arrays",
        "slug": "arrays"
      }
    },
    {
      "id": 4,
      "question_name": "3Sum",
      "question_link": "https://leetcode.com/problems/3sum/",
      "platform": "LEETCODE",
      "level": "MEDIUM",
      "type": "CLASSWORK",
      "topic_id": 1,
      "topic": {
        "id": 1,
        "topic_name": "Arrays",
        "slug": "arrays"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

**UI Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  📚 Class: Class 1 - Introduction to Arrays            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────┐ ┌─────────────────────────────┐ │
│  │ 📅 Date & Time      │ │ ⏱️ Duration                │ │
│  │ Feb 1, 2025        │ │ 60 minutes                 │ │
│  │ 10:00 AM           │ │                            │ │
│  └─────────────────────┴─────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 📖 Class Description                                 │ │
│  │ Basic introduction to arrays and their operations     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 📝 Class Notes                                       │ │
│  │ Arrays are fundamental data structures that store    │ │
│  │ elements of the same type in contiguous memory       │ │
│  │ locations. Key concepts include indexing, traversal,  │ │
│  │ and basic operations like insert, delete, and search.│ │
│  │                                                     │ │
│  │ [📄 Download PDF] [📋 Copy Notes] [✏️ Edit Notes]    │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ ❓ Assigned Questions (2)                    [+ Add] │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ Question                    │ Platform │ Level │ Type │   │
│  ├─────────────────────────────────────────────────────┤ │
│  │ Two Sum                     │ LEETCODE │ EASY  │ HOME│ [🗑️] │
│  │ Maximum Subarray            │ LEETCODE │ MEDIUM│ CLASS│[🗑️] │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ ➕ Add Questions Modal                               │ │
│  │                                                     │ │
│  │ 🔍 Search: [Two Sum_________]                       │ │
│  │ 🎯 Filter: [Arrays ▼] [EASY ▼] [LEETCODE ▼]        │ │
│  │                                                     │ │
│  │ ☐ Two Sum               🟢 EASY  💻 LEETCODE        │ │
│  │ ☐ Best Time to Buy    🟡 MEDIUM 💻 LEETCODE        │ │
│  │ ☐ 3Sum                 🟡 MEDIUM 💻 LEETCODE        │ │
│  │                                                     │ │
│  │           [➕ Add Selected]  [❌ Cancel]             │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Add Questions API**:
```http
POST /api/admin/{batchSlug}/topics/{topicSlug}/classes/{classSlug}/questions
```

**Request Body**:
```json
{
  "question_ids": [3, 4]
}
```

**Success Response (200)**:
```json
{
  "message": "Questions assigned successfully",
  "assignedCount": 2,
  "duplicateCount": 0,
  "totalCount": 2
}
```

---

## ❓ 5️⃣ Questions Library Page

**Route**: `/admin/questions`

**API Used**:
```http
GET /api/admin/questions?topicSlug={topicSlug}&platform={platform}&level={level}&type={type}&search={search}&page={page}&limit={limit}
POST /api/admin/questions
PATCH /api/admin/questions/:id
DELETE /api/admin/questions/:id
POST /api/admin/questions/bulk-upload
```

**Query Parameters**:
- `topicSlug` (string, optional) - Filter by topic slug
- `platform` (string, optional) - Filter by platform: `LEETCODE`, `GFG`, `INTERVIEWBIT`, `OTHER`
- `level` (string, optional) - Filter by level: `EASY`, `MEDIUM`, `HARD`
- `type` (string, optional) - Filter by type: `HOMEWORK`, `CLASSWORK`
- `search` (string, optional) - Search in question names
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 10)

**Questions Response**:
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
      "topic_id": 1,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z",
      "topic": {
        "id": 1,
        "topic_name": "Arrays",
        "slug": "arrays"
      },
      "assigned_count": 3,
      "solved_count": 12
    },
    {
      "id": 2,
      "question_name": "Maximum Subarray",
      "question_link": "https://leetcode.com/problems/maximum-subarray/",
      "platform": "LEETCODE",
      "level": "MEDIUM",
      "type": "CLASSWORK",
      "topic_id": 1,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z",
      "topic": {
        "id": 1,
        "topic_name": "Arrays",
        "slug": "arrays"
      },
      "assigned_count": 2,
      "solved_count": 8
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  },
  "filters": {
    "available": {
      "topics": [
        {"id": 1, "topic_name": "Arrays", "slug": "arrays", "count": 25},
        {"id": 2, "topic_name": "Linked Lists", "slug": "linked-lists", "count": 15}
      ],
      "platforms": [
        {"platform": "LEETCODE", "count": 35},
        {"platform": "GFG", "count": 10},
        {"platform": "INTERVIEWBIT", "count": 5}
      ],
      "levels": [
        {"level": "EASY", "count": 20},
        {"level": "MEDIUM", "count": 25},
        {"level": "HARD", "count": 5}
      ]
    }
  }
}
```

**UI Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  Questions Library                        [+ Create] [Bulk Upload] │
├─────────────────────────────────────────────────────────┤
│  🔍 Advanced Filters:                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Topic: [Arrays ▼] │ Platform: [LEETCODE ▼]     │   │
│  │ Level: [EASY ▼] │ Type: [HOMEWORK ▼]           │   │
│  │ Search: [Two Sum_________] │ Clear Filters       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Question              │ Topic │ Platform │ Level │ Type │ Assigned │ Solved │ Actions │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Two Sum               │ Arrays│ LEETCODE │ EASY  │ HOME │    3    │   12   │ [Edit][Delete] │   │
│  │ Maximum Subarray      │ Arrays│ LEETCODE │ MEDIUM│ CLASS│    2    │   8    │ [Edit][Delete] │   │
│  │ 3Sum                  │ Arrays│ LEETCODE │ MEDIUM│ HOME │    4    │   15   │ [Edit][Delete] │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Results: 3 of 50 total | Page 1 of 5                   │
│  Pagination: ← Previous 1 2 3 4 5 Next →                │
└─────────────────────────────────────────────────────────┘
```

**Create Question API**:
```http
POST /api/admin/questions
```

**Request Body**:
```json
{
  "question_name": "New Question",
  "question_link": "https://leetcode.com/problems/new-question/",
  "platform": "LEETCODE",
  "level": "EASY",
  "type": "HOMEWORK",
  "topic_id": 1
}
```

**Bulk Upload API**:
```http
POST /api/admin/questions/bulk-upload
```

**Request**: `multipart/form-data`
- `file`: CSV file with questions

**CSV Format**:
```csv
question_name,question_link,platform,level,type,topic_name
Two Sum,https://leetcode.com/problems/two-sum/,LEETCODE,EASY,HOMEWORK,Arrays
Maximum Subarray,https://leetcode.com/problems/maximum-subarray/,LEETCODE,MEDIUM,CLASSWORK,Arrays
```

---

## 👥 6️⃣ Students Management Page

**Route**: `/admin/students`

**API Used**:
```http
GET /api/admin/students?city={cityId}&batch={batchId}&search={search}&sortBy={field}&order={asc|desc}&page={page}&limit={limit}
POST /api/admin/students
PATCH /api/admin/students/:id
DELETE /api/admin/students/:id
```

**Query Parameters**:
- `city` (number, optional) - Filter by city ID
- `batch` (number, optional) - Filter by batch ID  
- `search` (string, optional) - Search in name, username, email
- `sortBy` (string, optional) - Sort by: `name`, `username`, `total_solved`, `created_at`, `last_active`
- `order` (string, optional) - Sort order: `asc`, `desc` (default: `desc`)
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 10)

**Students Response**:
```json
{
  "students": [
    {
      "id": 1,
      "name": "Dhruv Narang",
      "username": "dhruv_dev",
      "email": "dhruv@example.com",
      "leetcode_id": "dhruv_lc",
      "gfg_id": "dhruv_gfg",
      "is_profile_complete": true,
      "total_solved": 35,
      "easy_solved": 20,
      "medium_solved": 12,
      "hard_solved": 3,
      "current_streak": 7,
      "last_active": "2025-02-01T15:30:00.000Z",
      "city": {
        "id": 2,
        "city_name": "Bangalore"
      },
      "batch": {
        "id": 1,
        "batch_name": "SOT 2025",
        "slug": "bangalore-sot-2025"
      },
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "username": "jane_smith",
      "email": "jane@example.com",
      "leetcode_id": "jane_lc",
      "gfg_id": "jane_gfg",
      "is_profile_complete": false,
      "total_solved": 28,
      "easy_solved": 18,
      "medium_solved": 8,
      "hard_solved": 2,
      "current_streak": 3,
      "last_active": "2025-01-31T10:15:00.000Z",
      "city": {
        "id": 2,
        "city_name": "Bangalore"
      },
      "batch": {
        "id": 1,
        "batch_name": "SOT 2025",
        "slug": "bangalore-sot-2025"
      },
      "created_at": "2025-01-02T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  },
  "filters": {
    "applied": {
      "city": 2,
      "batch": 1,
      "search": "dhruv",
      "sortBy": "total_solved",
      "order": "desc"
    },
    "available": {
      "cities": [
        {"id": 1, "city_name": "Mumbai", "count": 17},
        {"id": 2, "city_name": "Bangalore", "count": 28}
      ],
      "batches": [
        {"id": 1, "batch_name": "SOT 2025", "count": 45}
      ]
    }
  }
}
```

**UI Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  Students                                   [+ Create]   │
├─────────────────────────────────────────────────────────┤
│  🔍 Advanced Filters:                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ City: [Bangalore ▼] │ Batch: [SOT 2025 ▼]      │   │
│  │ Search: [dhruv_________] │ Clear Filters        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Sort: [Total Solved ▼] [Last Active ▼] [Created At ▼]   │
│  Order: [Descending ▼]                                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Avatar │ Name          │ Username │ Solved │ Streak │ City │ Actions │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  🧑   │ Dhruv Narang  │ dhruv_dev│   35   │   7   │ Bangalore│ [View][Edit][Delete] │   │
│  │  👩   │ Jane Smith    │ jane_smi│   28   │   3   │ Bangalore│ [View][Edit][Delete] │   │
│  │  👨   │ John Doe      │ john_doe│   42   │  12   │ Mumbai   │ [View][Edit][Delete] │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Results: 3 of 45 total | Page 1 of 5                   │
│  Pagination: ← Previous 1 2 3 4 5 Next →                │
└─────────────────────────────────────────────────────────┘
```

**Create Student API**:
```http
POST /api/admin/students
```

**Request Body**:
```json
{
  "name": "New Student",
  "email": "student@example.com",
  "username": "student123",
  "password": "password123",
  "city_id": 2,
  "batch_id": 1,
  "leetcode_id": "student_lc",
  "gfg_id": "student_gfg"
}
```

---

## 📊 7️⃣ Student Report Page

**Route**: `/admin/students/[username]`

**API Used**:
```http
GET /api/admin/students/{username}
GET /api/admin/students/{username}/progress
POST /api/admin/students/progress
```

**Student Details Response**:
```json
{
  "student": {
    "id": 1,
    "name": "Dhruv Narang",
    "username": "dhruv_dev",
    "email": "dhruv@example.com",
    "leetcode_id": "dhruv_lc",
    "gfg_id": "dhruv_gfg",
    "is_profile_complete": true,
    "total_solved": 35,
    "easy_solved": 20,
    "medium_solved": 12,
    "hard_solved": 3,
    "current_streak": 7,
    "last_active": "2025-02-01T15:30:00.000Z",
    "city": {
      "id": 2,
      "city_name": "Bangalore"
    },
    "batch": {
      "id": 1,
      "batch_name": "SOT 2025",
      "slug": "bangalore-sot-2025"
    },
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

**Student Progress Response**:
```json
{
  "progress": [
    {
      "id": 1,
      "question_name": "Two Sum",
      "question_link": "https://leetcode.com/problems/two-sum/",
      "platform": "LEETCODE",
      "level": "EASY",
      "solved_at": "2025-02-01T10:30:00.000Z",
      "topic": {
        "id": 1,
        "topic_name": "Arrays",
        "slug": "arrays"
      }
    },
    {
      "id": 2,
      "question_name": "Maximum Subarray",
      "question_link": "https://leetcode.com/problems/maximum-subarray/",
      "platform": "LEETCODE",
      "level": "MEDIUM",
      "solved_at": "2025-02-01T14:15:00.000Z",
      "topic": {
        "id": 1,
        "topic_name": "Arrays",
        "slug": "arrays"
      }
    }
  ],
  "stats": {
    "totalSolved": 35,
    "easySolved": 20,
    "mediumSolved": 12,
    "hardSolved": 3,
    "currentStreak": 7,
    "topicsProgress": [
      {
        "topic": "Arrays",
        "solved": 8,
        "total": 10
      },
      {
        "topic": "Linked Lists",
        "solved": 5,
        "total": 8
      }
    ]
  }
}
```

**UI Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  Student Report: Dhruv Narang (@dhruv_dev)             │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Total   │ │   Easy  │ │ Medium  │ │  Hard   │       │
│  │ Solved  │ │ Solved  │ │ Solved  │ │ Solved  │       │
│  │   35    │ │   20    │ │   12    │ │    3    │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                         │
│  Current Streak: 7 days | Last Active: Feb 1, 2025      │
│                                                         │
│  Profile Information                                    │
│  Email: dhruv@example.com                               │
│  City: Bangalore | Batch: SOT 2025                      │
│  LeetCode: dhruv_lc | GFG: dhruv_gfg                   │
│                                                         │
│  Recent Activity                         [+ Add Progress] │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Question              │ Platform │ Level │ Solved At │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Two Sum               │ LEETCODE │ EASY  │ Feb 1, 10:30 │   │
│  │ Maximum Subarray      │ LEETCODE │ MEDIUM│ Feb 1, 14:15 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Topic Progress                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Topic         │ Solved │ Total │ Progress     │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Arrays        │   8    │  10   │ ████████▒▒  │   │
│  │ Linked Lists  │   5    │   8   │ ██████▒▒▒▒  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Add Progress API**:
```http
POST /api/admin/students/progress
```

**Request Body**:
```json
{
  "student_id": 1,
  "question_id": 3,
  "solved_at": "2025-02-01T16:00:00.000Z"
}
```

---

## 🎯 Final Page Structure Summary

### 🗺️ Complete Route Map
```
/admin/login
/admin/register
/admin/dashboard
/admin/topics
/admin/topics/[topicSlug]
/admin/topics/[topicSlug]/classes/[classSlug]
/admin/questions
/admin/students
/admin/students/[username]
```

### 🔄 Navigation Flow
```
Login → Dashboard → Topics → Topic Detail → Class Detail
                    ↓
                 Questions Library
                    ↓
                 Students → Student Report
```

### 📱 Responsive Design Notes
- **Desktop**: Full sidebar + header + content
- **Tablet**: Collapsible sidebar + header + content  
- **Mobile**: Hamburger menu + header + content

### 🎨 UI Components Library
- **Cards**: Stats, class info, student profile
- **Tables**: Data display with actions
- **Modals**: Create/Edit forms
- **Filters**: Search, dropdowns, date pickers
- **Charts**: Progress bars, statistics
- **Forms**: Validation, error handling

---

## 🔧 Technical Implementation Notes

### 📡 API Integration
- All API calls include `Authorization: Bearer {token}` header
- Error handling with user-friendly messages
- Loading states for all async operations
- Automatic token refresh on 403 errors

### 🔄 State Management
- Global state for: user info, selected city/batch, theme
- Local state for: forms, modals, filters
- Optimistic updates for better UX

### 🎯 Key Features
- **Real-time Updates**: WebSocket for live progress
- **Search & Filter**: Debounced search, multiple filters
- **Bulk Operations**: CSV upload, batch actions
- **Export**: PDF reports, CSV data export
- **Notifications**: Success/error toast messages

---

*This design document provides a complete blueprint for building the admin panel frontend with all necessary API integrations and UI specifications.*
