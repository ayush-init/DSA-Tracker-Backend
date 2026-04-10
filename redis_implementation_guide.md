# Redis Implementation Guide - One API at a Time

## Overview
This guide walks through Redis implementation for each API endpoint individually, showing exactly where to add caching and when to invalidate caches based on other API operations.

---

## 1. API: `/api/students/addedQuestions` (GET)

### Current Implementation Location
**File:** `src/services/questions/visibility-student.service.ts`

### Where to Add Cache
```typescript
// In visibility-student.service.ts
import redis from '../config/redis';
import { CacheInvalidation } from '../utils/cacheInvalidation';

export const getAssignedQuestionsService = async (studentId: number, filters: any) => {
  // Generate cache key based on student and filters
  const cacheKey = `student:assigned_questions:${studentId}:${JSON.stringify(filters)}`;
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('[CACHE HIT] assigned_questions:', studentId);
    return JSON.parse(cached);
  }
  
  // 2. Execute expensive query
  const result = await executeAssignedQuestionsQuery(studentId, filters);
  
  // 3. Cache result for 10 minutes
  await redis.setex(cacheKey, 600, JSON.stringify(result));
  console.log('[CACHE MISS] assigned_questions:', studentId);
  
  return result;
};
```

### When to Invalidate Cache
**Trigger APIs that invalidate this cache:**

#### 1. Question Assignment Changes
**File:** `src/services/questions/visibility.service.ts`
```typescript
// After assigning questions to a class
export const assignQuestionsToClassService = async (data: AssignmentData) => {
  // ... assignment logic ...
  
  // Invalidate all affected students' assigned questions cache
  await CacheInvalidation.invalidateAssignedQuestionsForClass(data.classId);
  
  return result;
};

// In cacheInvalidation.ts
static async invalidateAssignedQuestionsForClass(classId: number) {
  // ✅ CORRECT WAY: Get keys first, then delete
  const keys = await redis.keys('student:assigned_questions:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

#### 2. Question Removal from Class
**File:** `src/services/questions/visibility.service.ts`
```typescript
// After removing questions
export const removeQuestionFromClassService = async (classId: number, questionId: number) => {
  // ... removal logic ...
  
  // Invalidate assigned questions cache for all students in class
  await CacheInvalidation.invalidateAssignedQuestionsForClass(classId);
}
```

#### 3. Batch/Class Changes
**Files:** `src/services/batches/batch.service.ts`, `src/services/classes/class.service.ts`
```typescript
// After batch/class modifications that affect question assignments
await CacheInvalidation.invalidateAssignedQuestionsForBatch(batchId);
```

---

## 2. API: `/api/students/leaderboard` (POST)

### Current Implementation Location
**File:** `src/services/leaderboard/studentLeaderboard.service.ts`

### Where to Add Cache
```typescript
// In studentLeaderboard.service.ts
import redis from '../config/redis';

export async function getStudentLeaderboard(
  jwtData: JwtData,
  filters: { city?: string; year?: number },
  search?: string
): Promise<StudentLeaderboardResult> {
  // Generate cache key
  const cacheKey = `leaderboard:student:${jwtData.studentId}:${filters.city || 'all'}:${filters.year || jwtData.batchYear}:${search || ''}`;
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('[CACHE HIT] student_leaderboard:', jwtData.studentId);
    return JSON.parse(cached);
  }
  
  // 2. Execute expensive query
  const result = await executeStudentLeaderboardQuery(jwtData, filters, search);
  
  // 3. Cache result for 5 minutes (leaderboards change frequently)
  await redis.setex(cacheKey, 300, JSON.stringify(result));
  console.log('[CACHE MISS] student_leaderboard:', jwtData.studentId);
  
  return result;
}
```

### When to Invalidate Cache
**Trigger APIs that invalidate this cache:**

#### 1. Student Progress Updates
**File:** `src/services/progressSync/sync-core.service.ts`
```typescript
// After student solves a question
export const syncOneStudent = async (studentId: number) => {
  // ... sync logic ...
  
  // Invalidate ALL leaderboard caches (ranks changed)
  await CacheInvalidation.invalidateAllLeaderboards();
  
  return result;
};

// In cacheInvalidation.ts
static async invalidateAllLeaderboards() {
  const patterns = [
    'leaderboard:student:*',
    'leaderboard:admin:*',
    'leaderboard:top10:*'
  ];
  
  await Promise.all(patterns.map(pattern => {
    // Get all keys matching pattern
    return redis.keys(pattern).then(keys => {
      if (keys.length > 0) return redis.del(...keys);
    });
  }));
}
```

#### 2. Manual Leaderboard Sync
**File:** `src/services/leaderboardSync/sync-core.service.ts`
```typescript
// After leaderboard recalculation
export const calculateLeaderboard = async () => {
  // ... calculation logic ...
  
  // Invalidate all leaderboard caches
  await CacheInvalidation.invalidateAllLeaderboards();
}
```

#### 3. Student Data Changes
**File:** `src/services/students/student.service.ts`
```typescript
// After student profile updates that affect rankings
export const updateStudentService = async (studentId: number, data: UpdateStudentData) => {
  // ... update logic ...
  
  // Invalidate leaderboards (if ranking-relevant data changed)
  if (data.batch_id || data.city_id) {
    await CacheInvalidation.invalidateAllLeaderboards();
  }
}
```

---

## 3. API: `/api/students/me` (GET) & `/api/students/profile/:username` (GET)

### Current Implementation Locations
**Files:** 
- `src/services/students/profile-core.service.ts` (for /me)
- `src/services/students/profile-public.service.ts` (for /:username)

### Where to Add Cache
```typescript
// In profile-core.service.ts
export const getStudentProfileService = async (studentId: number) => {
  const cacheKey = `student:profile:${studentId}`;
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('[CACHE HIT] student_profile:', studentId);
    return JSON.parse(cached);
  }
  
  // 2. Execute expensive profile assembly
  const result = await buildStudentProfile(studentId);
  
  // 3. Cache result for 15 minutes
  await redis.setex(cacheKey, 900, JSON.stringify(result));
  console.log('[CACHE MISS] student_profile:', studentId);
  
  return result;
};

// In profile-public.service.ts
export const getStudentProfilePublicService = async (username: string) => {
  // First get student ID from username
  const student = await prisma.student.findUnique({
    where: { username },
    select: { id: true }
  });
  
  if (!student) return null;
  
  const cacheKey = `student:profile:public:${student.id}`;
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('[CACHE HIT] public_profile:', username);
    return JSON.parse(cached);
  }
  
  // 2. Execute expensive profile assembly
  const result = await buildPublicStudentProfile(student.id);
  
  // 3. Cache result for 15 minutes
  await redis.setex(cacheKey, 900, JSON.stringify(result));
  console.log('[CACHE MISS] public_profile:', username);
  
  return result;
};
```

### When to Invalidate Cache
**Trigger APIs that invalidate this cache:**

#### 1. Student Progress Updates
**File:** `src/services/progressSync/sync-core.service.ts`
```typescript
// After student solves a question
export const syncOneStudent = async (studentId: number) => {
  // ... sync logic ...
  
  // Invalidate student profile caches
  await CacheInvalidation.invalidateStudentProfile(studentId);
  
  return result;
};

// In cacheInvalidation.ts
static async invalidateStudentProfile(studentId: number) {
  const keys = [
    `student:profile:${studentId}`,
    `student:profile:public:${studentId}`
  ];
  
  await Promise.all(keys.map(key => redis.del(key)));
}
```

#### 2. Profile Updates
**File:** `src/services/students/student.service.ts`
```typescript
// After student updates their profile
export const updateStudentService = async (studentId: number, data: UpdateStudentData) => {
  // ... update logic ...
  
  // Invalidate profile caches
  await CacheInvalidation.invalidateStudentProfile(studentId);
}
```

#### 3. Profile Image Updates
**File:** `src/controllers/profileImage.controller.ts`
```typescript
// After profile image upload/delete
export const uploadProfileImage = async (req: Request, res: Response) => {
  // ... upload logic ...
  
  // Invalidate profile caches
  await CacheInvalidation.invalidateStudentProfile(studentId);
}
```

---

## 4. API: `/api/students/topics` (GET)

### Current Implementation Location
**File:** `src/services/topics/topic-query.service.ts`

### Where to Add Cache
```typescript
// In topic-query.service.ts
export const getTopicsWithBatchProgressService = async (studentId: number, batchId: number, query?: any) => {
  // Generate cache key
  const cacheKey = `student:topics:${studentId}:${batchId}:${JSON.stringify(query || {})}`;
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('[CACHE HIT] student_topics:', studentId);
    return JSON.parse(cached);
  }
  
  // 2. Execute expensive topic progress query
  const result = await executeTopicsWithProgressQuery(studentId, batchId, query);
  
  // 3. Cache result for 10 minutes
  await redis.setex(cacheKey, 600, JSON.stringify(result));
  console.log('[CACHE MISS] student_topics:', studentId);
  
  return result;
};
```

### When to Invalidate Cache
**Trigger APIs that invalidate this cache:**

#### 1. Student Progress Updates
**File:** `src/services/progressSync/sync-core.service.ts`
```typescript
// After student solves a question
export const syncOneStudent = async (studentId: number) => {
  // ... sync logic ...
  
  // Invalidate topics cache for this student
  await CacheInvalidation.invalidateStudentTopics(studentId);
  
  return result;
};

// In cacheInvalidation.ts
static async invalidateStudentTopics(studentId: number) {
  const patterns = [
    `student:topics:${studentId}:*`
  ];
  
  await Promise.all(patterns.map(pattern => {
    return redis.keys(pattern).then(keys => {
      if (keys.length > 0) return redis.del(...keys);
    });
  }));
}
```

#### 2. Topic Assignment Changes
**File:** `src/services/questions/visibility.service.ts`
```typescript
// After question assignments to topics/classes
export const assignQuestionsToClassService = async (data: AssignmentData) => {
  // ... assignment logic ...
  
  // Invalidate topics cache for all students in batch
  await CacheInvalidation.invalidateTopicsForBatch(data.batchId);
}

static async invalidateTopicsForBatch(batchId: number) {
  // ✅ CORRECT WAY: Get keys first, then delete
  const keys = await redis.keys('student:topics:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

---

## 5. API: `/api/students/topics/:topicSlug` (GET)

### Current Implementation Location
**File:** `src/services/topics/topic-progress.service.ts`

### Where to Add Cache
```typescript
// In topic-progress.service.ts
export const getTopicOverviewWithClassesSummaryService = async (studentId: number, batchId: number, topicSlug: string) => {
  // Generate cache key
  const cacheKey = `student:topic_overview:${studentId}:${batchId}:${topicSlug}`;
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('[CACHE HIT] topic_overview:', topicSlug);
    return JSON.parse(cached);
  }
  
  // 2. Execute expensive topic overview query
  const result = await executeTopicOverviewQuery(studentId, batchId, topicSlug);
  
  // 3. Cache result for 10 minutes
  await redis.setex(cacheKey, 600, JSON.stringify(result));
  console.log('[CACHE MISS] topic_overview:', topicSlug);
  
  return result;
};
```

### When to Invalidate Cache
**Trigger APIs that invalidate this cache:**

#### 1. Student Progress Updates
**File:** `src/services/progressSync/sync-core.service.ts`
```typescript
// After student solves a question
export const syncOneStudent = async (studentId: number) => {
  // ... sync logic ...
  
  // Invalidate all topic overview caches for this student
  await CacheInvalidation.invalidateStudentTopicOverviews(studentId);
  
  return result;
};

// In cacheInvalidation.ts
static async invalidateStudentTopicOverviews(studentId: number) {
  const patterns = [
    `student:topic_overview:${studentId}:*`
  ];
  
  await Promise.all(patterns.map(pattern => {
    return redis.keys(pattern).then(keys => {
      if (keys.length > 0) return redis.del(...keys);
    });
  }));
}
```

#### 2. Topic Assignment Changes
**File:** `src/services/questions/visibility.service.ts`
```typescript
// After question assignments
export const assignQuestionsToClassService = async (data: AssignmentData) => {
  // ... assignment logic ...
  
  // Get topic info and invalidate topic overview caches
  await CacheInvalidation.invalidateTopicOverviewForBatch(data.batchId);
}

static async invalidateTopicOverviewForBatch(batchId: number) {
  // ✅ CORRECT WAY: Get keys first, then delete
  const keys = await redis.keys('student:topic_overview:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

---

## 6. API: `/api/students/topics/:topicSlug/classes/:classSlug` (GET)

### Current Implementation Location
**File:** `src/services/classes/class-progress.service.ts`

### Where to Add Cache
```typescript
// In class-progress.service.ts
export const getClassProgressService = async (studentId: number, batchId: number, topicSlug: string, classSlug: string) => {
  // Generate cache key
  const cacheKey = `student:class_progress:${studentId}:${batchId}:${topicSlug}:${classSlug}`;
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('[CACHE HIT] class_progress:', classSlug);
    return JSON.parse(cached);
  }
  
  // 2. Execute expensive class progress query
  const result = await executeClassProgressQuery(studentId, batchId, topicSlug, classSlug);
  
  // 3. Cache result for 10 minutes
  await redis.setex(cacheKey, 600, JSON.stringify(result));
  console.log('[CACHE MISS] class_progress:', classSlug);
  
  return result;
};
```

### When to Invalidate Cache
**Trigger APIs that invalidate this cache:**

#### 1. Student Progress Updates
**File:** `src/services/progressSync/sync-core.service.ts`
```typescript
// After student solves a question
export const syncOneStudent = async (studentId: number) => {
  // ... sync logic ...
  
  // Invalidate all class progress caches for this student
  await CacheInvalidation.invalidateStudentClassProgress(studentId);
  
  return result;
};

// In cacheInvalidation.ts
static async invalidateStudentClassProgress(studentId: number) {
  const patterns = [
    `student:class_progress:${studentId}:*`
  ];
  
  await Promise.all(patterns.map(pattern => {
    return redis.keys(pattern).then(keys => {
      if (keys.length > 0) return redis.del(...keys);
    });
  }));
}
```

#### 2. Class Assignment Changes
**File:** `src/services/questions/visibility.service.ts`
```typescript
// After question assignments to classes
export const assignQuestionsToClassService = async (data: AssignmentData) => {
  // ... assignment logic ...
  
  // Invalidate class progress caches for all students in this class
  await CacheInvalidation.invalidateClassProgressForClass(data.classId);
}

static async invalidateClassProgressForClass(classId: number) {
  // ✅ CORRECT WAY: Get keys first, then delete
  const keys = await redis.keys('student:class_progress:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

---

## 7. API: `/api/students/bookmarks` (GET/POST/PUT/DELETE)

### Current Implementation Location
**File:** `src/services/bookmarks/bookmark.service.ts`

### Where to Add Cache
```typescript
// In bookmark.service.ts
export const getBookmarksService = async (studentId: number, query?: any) => {
  const cacheKey = `student:bookmarks:${studentId}:${JSON.stringify(query || {})}`;
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('[CACHE HIT] bookmarks:', studentId);
    return JSON.parse(cached);
  }
  
  // 2. Execute bookmark query
  const result = await executeBookmarkQuery(studentId, query);
  
  // 3. Cache result for 10 minutes
  await redis.setex(cacheKey, 600, JSON.stringify(result));
  console.log('[CACHE MISS] bookmarks:', studentId);
  
  return result;
};

// For POST/PUT/DELETE operations - invalidate cache
export const addBookmarkService = async (studentId: number, data: BookmarkData) => {
  // ... add bookmark logic ...
  
  // Invalidate bookmarks cache for this student
  await CacheInvalidation.invalidateStudentBookmarks(studentId);
  
  return result;
};

export const updateBookmarkService = async (studentId: number, bookmarkId: number, data: UpdateBookmarkData) => {
  // ... update bookmark logic ...
  
  // Invalidate bookmarks cache for this student
  await CacheInvalidation.invalidateStudentBookmarks(studentId);
  
  return result;
};

export const deleteBookmarkService = async (studentId: number, bookmarkId: number) => {
  // ... delete bookmark logic ...
  
  // Invalidate bookmarks cache for this student
  await CacheInvalidation.invalidateStudentBookmarks(studentId);
  
  return result;
};

// In cacheInvalidation.ts
static async invalidateStudentBookmarks(studentId: number) {
  // ✅ CORRECT WAY: Get keys first, then delete
  const keys = await redis.keys('student:bookmarks:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

---

## 8. API: `/api/students/recent-questions` (GET)

### Current Implementation Location
**File:** `src/services/questions/recentQuestions.service.ts`

### Where to Add Cache
```typescript
// In recentQuestions.service.ts
export const getRecentQuestionsService = async (studentId: number, batchId: number, limit?: number) => {
  const cacheKey = `student:recent_questions:${studentId}:${batchId}:${limit || 10}`;
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('[CACHE HIT] recent_questions:', studentId);
    return JSON.parse(cached);
  }
  
  // 2. Execute recent questions query
  const result = await executeRecentQuestionsQuery(studentId, batchId, limit);
  
  // 3. Cache result for 15 minutes
  await redis.setex(cacheKey, 900, JSON.stringify(result));
  console.log('[CACHE MISS] recent_questions:', studentId);
  
  return result;
};
```

### When to Invalidate Cache
**Trigger APIs that invalidate this cache:**

#### 1. Student Progress Updates
**File:** `src/services/progressSync/sync-core.service.ts`
```typescript
// After student solves a question
export const syncOneStudent = async (studentId: number) => {
  // ... sync logic ...
  
  // Invalidate recent questions cache for this student
  await CacheInvalidation.invalidateStudentRecentQuestions(studentId);
  
  return result;
};

// In cacheInvalidation.ts
static async invalidateStudentRecentQuestions(studentId: number) {
  // ✅ CORRECT WAY: Get keys first, then delete
  const keys = await redis.keys('student:recent_questions:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

---

## 9. API: `/api/admin/stats` (POST)

### Current Implementation Location
**File:** `src/services/admin/admin-stats.service.ts`

### Where to Add Cache
```typescript
// In admin-stats.service.ts
export const getAdminStatsService = async (filters: any) => {
  const cacheKey = `admin:stats:${JSON.stringify(filters)}`;
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('[CACHE HIT] admin_stats');
    return JSON.parse(cached);
  }
  
  // 2. Execute expensive stats calculation
  const result = await calculateAdminStats(filters);
  
  // 3. Cache result for 5 minutes (stats change frequently)
  await redis.setex(cacheKey, 300, JSON.stringify(result));
  console.log('[CACHE MISS] admin_stats');
  
  return result;
};
```

### When to Invalidate Cache
**Trigger APIs that invalidate this cache:**

#### 1. Student Registration/Updates
**File:** `src/services/students/student.service.ts`
```typescript
// After student operations
export const createStudentService = async (data: CreateStudentData) => {
  // ... creation logic ...
  
  // Invalidate admin stats
  await CacheInvalidation.invalidateAdminStats();
}

export const updateStudentService = async (studentId: number, data: UpdateStudentData) => {
  // ... update logic ...
  
  // Invalidate admin stats
  await CacheInvalidation.invalidateAdminStats();
}
```

#### 2. Question/Topic/Batch Operations
**File:** Various service files
```typescript
// After any data-modifying operation
export const createTopicService = async (data: TopicData) => {
  // ... creation logic ...
  
  // Invalidate admin stats
  await CacheInvalidation.invalidateAdminStats();
}

// In cacheInvalidation.ts
static async invalidateAdminStats() {
  const patterns = [
    'admin:stats:*'
  ];
  
  await Promise.all(patterns.map(pattern => {
    return redis.keys(pattern).then(keys => {
      if (keys.length > 0) return redis.del(...keys);
    });
  }));
}
```

---

## 10. API: `/api/admin/topics` (GET/POST/PUT/DELETE)

### Current Implementation Location
**File:** `src/services/topics/topic.service.ts`

### Where to Add Cache
```typescript
// In topic.service.ts
export const getAllTopicsService = async () => {
  const cacheKey = 'admin:topics:all';
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('[CACHE HIT] admin_topics');
    return JSON.parse(cached);
  }
  
  // 2. Execute topics query
  const result = await prisma.topic.findMany({
    orderBy: { created_at: 'desc' }
  });
  
  // 3. Cache result for 30 minutes
  await redis.setex(cacheKey, 1800, JSON.stringify(result));
  console.log('[CACHE MISS] admin_topics');
  
  return result;
};

// For POST/PUT/DELETE operations - invalidate cache
export const createTopicService = async (data: TopicData) => {
  // ... creation logic ...
  
  // Invalidate topics cache
  await CacheInvalidation.invalidateAdminTopics();
  
  return result;
};

export const updateTopicService = async (topicSlug: string, data: UpdateTopicData) => {
  // ... update logic ...
  
  // Invalidate topics cache
  await CacheInvalidation.invalidateAdminTopics();
  
  return result;
};

export const deleteTopicService = async (topicSlug: string) => {
  // ... deletion logic ...
  
  // Invalidate topics cache
  await CacheInvalidation.invalidateAdminTopics();
  
  return result;
};

// In cacheInvalidation.ts
static async invalidateAdminTopics() {
  const keys = [
    'admin:topics:all',
    'static:topics' // Also invalidate public topics cache
  ];
  
  await Promise.all(keys.map(key => redis.del(key)));
}
```

---

## Cache Invalidation Utility

### Create: `src/utils/cacheInvalidation.ts`
```typescript
import redis from '../config/redis';
import prisma from '../config/prisma';

export class CacheInvalidation {
  
  // Student-specific invalidation
  static async invalidateStudent(studentId: number, batchId?: number) {
    const patterns = [
      `student:profile:${studentId}`,
      `student:profile:public:${studentId}`,
      `student:assigned_questions:${studentId}:*`,
      `student:topics:${studentId}:*`,
      `student:topic_overview:${studentId}:*`,
      `student:class_progress:${studentId}:*`,
      `student:bookmarks:${studentId}:*`,
      `student:recent_questions:${studentId}:*`
    ];
    
    await Promise.all(patterns.map(pattern => {
      return redis.keys(pattern).then(keys => {
        if (keys.length > 0) return redis.del(...keys);
      });
    }));
    
    // Also invalidate leaderboards (student rank changed)
    await this.invalidateAllLeaderboards();
  }
  
  // Leaderboard invalidation
  static async invalidateAllLeaderboards() {
    const patterns = [
      'leaderboard:student:*',
      'leaderboard:admin:*',
      'leaderboard:top10:*'
    ];
    
    await Promise.all(patterns.map(pattern => {
      return redis.keys(pattern).then(keys => {
        if (keys.length > 0) return redis.del(...keys);
      });
    }));
  }
  
  // Batch-level invalidation
  static async invalidateBatch(batchId: number) {
    // ✅ CORRECT WAY: Get keys first, then delete
    const patterns = [
      'student:assigned_questions:*',
      'student:topics:*',
      'student:topic_overview:*',
      'student:class_progress:*',
      'student:recent_questions:*'
    ];
    
    await Promise.all(patterns.map(pattern => {
      return redis.keys(pattern).then(keys => {
        if (keys.length > 0) return redis.del(...keys);
      });
    }));
  }
  
  // Admin stats invalidation
  static async invalidateAdminStats() {
    const patterns = ['admin:stats:*'];
    
    await Promise.all(patterns.map(pattern => {
      return redis.keys(pattern).then(keys => {
        if (keys.length > 0) return redis.del(...keys);
      });
    }));
  }
  
  // Topics invalidation
  static async invalidateAdminTopics() {
    const keys = [
      'admin:topics:all',
      'static:topics'
    ];
    
    await Promise.all(keys.map(key => redis.del(key)));
  }
  
  // Bookmarks invalidation
  static async invalidateStudentBookmarks(studentId: number) {
    const patterns = [`student:bookmarks:${studentId}:*`];
    
    await Promise.all(patterns.map(pattern => {
      return redis.keys(pattern).then(keys => {
        if (keys.length > 0) return redis.del(...keys);
      });
    }));
  }
}
```

---

## Implementation Order (One by One)

### Day 1: Start with `/api/students/addedQuestions`
1. Add caching to `visibility-student.service.ts`
2. Add invalidation to `visibility.service.ts`
3. Test cache hit/miss behavior
4. Monitor performance improvement

### Day 2: Implement `/api/students/leaderboard`
1. Add caching to `studentLeaderboard.service.ts`
2. Add invalidation to `sync-core.service.ts`
3. Test with leaderboard queries
4. Verify cache invalidation works

### Day 3: Implement `/api/students/me` and `/api/students/profile/:username`
1. Add caching to both profile services
2. Add invalidation to progress sync and profile update services
3. Test profile loading performance

### Day 4: Implement `/api/students/topics`
1. Add caching to `topic-query.service.ts`
2. Add invalidation to progress sync and assignment services
3. Test topics page performance

### Day 5: Implement `/api/students/topics/:topicSlug`
1. Add caching to topic progress service
2. Add invalidation to relevant services
3. Test individual topic pages

### Continue this pattern for remaining APIs...

---

## Testing Strategy

### For Each API:
1. **Load Test Before Caching:**
   ```bash
   ab -n 100 -c 10 http://localhost:5000/api/students/addedQuestions
   ```

2. **Load Test After Caching:**
   ```bash
   ab -n 100 -c 10 http://localhost:5000/api/students/addedQuestions
   ```

3. **Verify Cache Hits:**
   - Check console logs for `[CACHE HIT]` messages
   - Monitor Redis keys: `redis-cli keys "*"`

4. **Verify Cache Invalidation:**
   - Make data changes (solve question, update profile)
   - Verify cache is invalidated and fresh data is loaded

---

## Success Metrics

### Expected Performance Improvements:
- `addedQuestions`: 1-2s -> <300ms
- `leaderboard`: 2-5s -> <200ms  
- `profile`: 1-3s -> <500ms
- `topics`: 800ms-1.5s -> <400ms
- `admin/stats`: 1-3s -> <500ms

### Cache Hit Rate Targets:
- Student APIs: 75-85%
- Admin APIs: 60-70%
- Static data: 90-95%

---

This guide provides a step-by-step approach to implement Redis caching one API at a time, with clear cache locations and invalidation strategies for each endpoint.
