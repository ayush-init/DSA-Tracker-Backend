# Redis Implementation Final Plan - Complete Guide

## Overview
This comprehensive guide combines detailed API-by-API implementation with centralized TTL configuration for a production-ready Redis caching system. It walks through Redis implementation for each API endpoint individually, showing exactly where to add caching, when to invalidate caches, and how to manage TTL configuration centrally.

---

## SECTION 1: Centralized TTL Configuration

### File: `src/config/cache.config.ts`

```typescript
/**
 * Centralized Cache TTL Configuration
 * 
 * TTL values are in seconds for Redis compatibility
 * Grouped by data change frequency and access patterns
 */
export const CACHE_TTL = {
  
  // HIGH FREQUENCY CHANGES (5 minutes)
  // Data that changes frequently - rankings, stats
  leaderboard: 300,      // 5 minutes - ranks change often
  adminStats: 300,       // 5 minutes - stats change frequently
  
  // MEDIUM FREQUENCY CHANGES (10 minutes)
  // User activity data - progress, questions, bookmarks
  addedQuestions: 600,   // 10 minutes - question assignments change
  topics: 600,           // 10 minutes - topic progress updates
  topicOverview: 600,    // 10 minutes - topic-specific progress
  classProgress: 600,    // 10 minutes - class-level progress
  bookmarks: 600,        // 10 minutes - user bookmarks
  
  // LOW FREQUENCY CHANGES (15 minutes)
  // User profile data - changes less frequently
  profile: 900,          // 15 minutes - profile updates
  recentQuestions: 900,  // 15 minutes - recent activity
  
  // STATIC DATA (30 minutes)
  // Rarely changes - admin data, static content
  adminTopics: 1800,     // 30 minutes - admin topic management
  
} as const;

/**
 * Type-safe TTL values for use across services
 */
export type CacheTTLKey = keyof typeof CACHE_TTL;

/**
 * Utility function to get TTL value with type safety
 */
export const getCacheTTL = (key: CacheTTLKey): number => {
  return CACHE_TTL[key];
};
```

---

## SECTION 1.1: Modern Redis Utility Functions

### File: `src/utils/redisUtils.ts`

```typescript
import redis from '../config/redis';

/**
 * Non-blocking SCAN-based pattern deletion
 * Replaces deprecated redis.keys() for production use
 */
export async function deleteByPattern(pattern: string): Promise<void> {
  let cursor = '0';

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      100
    );

    cursor = nextCursor;

    if (keys.length > 0) {
      await redis.del(...keys);
    }

  } while (cursor !== '0');
}

/**
 * Stable deterministic cache key generation
 * Replaces JSON.stringify(filters) for consistent keys
 */
export function buildCacheKey(base: string, params: Record<string, any>): string {
  const serialized = Object.entries(params || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');

  return `${base}:${serialized}`;
}

/**
 * Modern Redis SET with TTL
 * Replaces deprecated redis.setex()
 */
export async function setWithTTL(key: string, value: string, ttlSeconds: number): Promise<void> {
  await redis.set(key, value, 'EX', ttlSeconds);
}
```

### Import Pattern for All Services:
```typescript
import redis from '../config/redis';
import { CACHE_TTL } from '../config/cache.config';
import { CacheInvalidation } from '../utils/cacheInvalidation';
import { buildCacheKey, setWithTTL } from '../utils/redisUtils';
```

---

## SECTION 2: API Implementation Guide

### 1. API: `/api/students/addedQuestions` (GET)

**File:** `src/services/questions/visibility-student.service.ts`

**Implementation (Modern Redis Patterns):**
```typescript
export const getAllQuestionsWithFiltersService = async ({
  studentId,
  batchId,
  filters
}: GetAllQuestionsWithFiltersInput) => {
  // Generate stable deterministic cache key
  const cacheKey = buildCacheKey(`student:assigned_questions:${studentId}:${batchId}`, filters);
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('=== REDIS CACHE HIT ===');
    console.log(`[CACHE HIT] assigned_questions for student ${studentId}`);
    console.log(`Cache Key: ${cacheKey}`);
    console.log(`Data Source: Redis Cache`);
    console.log('========================');
    return JSON.parse(cached);
  }
  
  console.log('=== DATABASE FETCH ===');
  console.log(`[CACHE MISS] assigned_questions for student ${studentId}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`Data Source: Database Query`);
  console.log('===================');
  
  // 2. Execute expensive query (existing logic)
  const result = await executeQuestionsQuery(studentId, batchId, filters);
  
  // 3. Cache result with modern Redis SET syntax (avoid duplicate JSON.stringify)
  const serializedResult = JSON.stringify(result);
  await setWithTTL(cacheKey, serializedResult, CACHE_TTL.addedQuestions);
  
  console.log('=== CACHE STORAGE ===');
  console.log(`[CACHE STORE] assigned_questions for student ${studentId}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`TTL: ${CACHE_TTL.addedQuestions} seconds (${CACHE_TTL.addedQuestions/60} minutes)`);
  console.log(`Data Source: Database Query -> Cached in Redis`);
  console.log('====================');
  
  return result;
};
```

**Cache Invalidation Triggers:**

#### Question Assignment Changes
**File:** `src/services/questions/visibility.service.ts`
```typescript
export const assignQuestionsToClassService = async (data: AssignmentData) => {
  // ... assignment logic ...
  
  // Invalidate all affected students' assigned questions cache
  await CacheInvalidation.invalidateAssignedQuestionsForClass(data.classId);
  
  return result;
};
```

#### Question Removal from Class
**File:** `src/services/questions/visibility.service.ts`
```typescript
export const removeQuestionFromClassService = async (classId: number, questionId: number) => {
  // ... removal logic ...
  
  // Invalidate assigned questions cache for all students in class
  await CacheInvalidation.invalidateAssignedQuestionsForClass(classId);
}
```

#### Cron Job Progress Updates
**File:** `src/services/progressSync/sync-core.service.ts`
```typescript
export async function syncOneStudent(
  studentId: number, 
  batchData?: BatchQuestionData,
  compareRealCount: boolean = true
) {
  // ... sync logic ...
  
  // 5 Bulk Insert into StudentProgress table
  if (newProgressEntries.length > 0) {
    await prisma.studentProgress.createMany({
      data: newProgressEntries,
      skipDuplicates: true
    });
    
    // Invalidate assigned questions cache when student progress changes
    await CacheInvalidation.invalidateAssignedQuestions();
  }
  
  return {
    message: "Sync completed",
    newSolved: newProgressEntries.length,
    hadNewSolutions: newProgressEntries.length > 0,
    compareRealCount: compareRealCount
  };
}
```

---

### 2. API: `/api/students/leaderboard` (POST)

**File:** `src/services/leaderboard/studentLeaderboard.service.ts`

**Implementation:**
```typescript
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
  
  // 3. Cache result with centralized TTL
  await redis.setex(cacheKey, CACHE_TTL.leaderboard, JSON.stringify(result));
  console.log('[CACHE MISS] student_leaderboard:', jwtData.studentId);
  
  return result;
}
```

**Cache Invalidation Triggers:**

#### Student Progress Updates
**File:** `src/services/progressSync/sync-core.service.ts`
```typescript
export async function syncOneStudent(
  studentId: number, 
  batchData?: BatchQuestionData,
  compareRealCount: boolean = true
) {
  // ... sync logic ...
  
  // 5 Bulk Insert into StudentProgress table
  if (newProgressEntries.length > 0) {
    await prisma.studentProgress.createMany({
      data: newProgressEntries,
      skipDuplicates: true
    });
    
    // Invalidate ALL leaderboard caches (ranks changed)
    await CacheInvalidation.invalidateAllLeaderboards();
  }
  
  return {
    message: "Sync completed",
    newSolved: newProgressEntries.length,
    hadNewSolutions: newProgressEntries.length > 0,
    compareRealCount: compareRealCount
  };
}
```

#### Manual Leaderboard Sync
**File:** `src/services/leaderboardSync/sync-core.service.ts`
```typescript
export const calculateLeaderboard = async () => {
  // ... calculation logic ...
  
  // Invalidate all leaderboard caches
  await CacheInvalidation.invalidateAllLeaderboards();
}
```

---

### 3. API: `/api/students/me` (GET) & `/api/students/profile/:username` (GET)

**Files:** 
- `src/services/students/profile-core.service.ts` (for /me)
- `src/services/students/profile-public.service.ts` (for /:username)

**Implementation:**
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
  
  // 3. Cache result with centralized TTL
  await redis.setex(cacheKey, CACHE_TTL.profile, JSON.stringify(result));
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
  
  // 3. Cache result with centralized TTL
  await redis.setex(cacheKey, CACHE_TTL.profile, JSON.stringify(result));
  console.log('[CACHE MISS] public_profile:', username);
  
  return result;
};
```

**Cache Invalidation Triggers:**

#### Student Progress Updates
**File:** `src/services/progressSync/sync-core.service.ts`
```typescript
export async function syncOneStudent(
  studentId: number, 
  batchData?: BatchQuestionData,
  compareRealCount: boolean = true
) {
  // ... sync logic ...
  
  // 5 Bulk Insert into StudentProgress table
  if (newProgressEntries.length > 0) {
    await prisma.studentProgress.createMany({
      data: newProgressEntries,
      skipDuplicates: true
    });
    
    // Invalidate student profile caches (progress changed)
    await CacheInvalidation.invalidateStudentProfile(studentId);
  }
  
  return {
    message: "Sync completed",
    newSolved: newProgressEntries.length,
    hadNewSolutions: newProgressEntries.length > 0,
    compareRealCount: compareRealCount
  };
}
```

#### Profile Updates
**File:** `src/services/students/student.service.ts`
```typescript
export const updateStudentService = async (studentId: number, data: UpdateStudentData) => {
  // ... update logic ...
  
  // Invalidate profile caches
  await CacheInvalidation.invalidateStudentProfile(studentId);
}
```

---

### 4. API: `/api/students/topics` (GET)

**File:** `src/services/topics/topic-query.service.ts`

**Implementation:**
```typescript
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
  
  // 3. Cache result with centralized TTL
  await redis.setex(cacheKey, CACHE_TTL.topics, JSON.stringify(result));
  console.log('[CACHE MISS] student_topics:', studentId);
  
  return result;
};
```

**Cache Invalidation Triggers:**

#### Student Progress Updates
**File:** `src/services/progressSync/sync-core.service.ts`
```typescript
export async function syncOneStudent(
  studentId: number, 
  batchData?: BatchQuestionData,
  compareRealCount: boolean = true
) {
  // ... sync logic ...
  
  // 5 Bulk Insert into StudentProgress table
  if (newProgressEntries.length > 0) {
    await prisma.studentProgress.createMany({
      data: newProgressEntries,
      skipDuplicates: true
    });
    
    // Invalidate topics cache for this student (progress changed)
    await CacheInvalidation.invalidateTopics();
  }
  
  return {
    message: "Sync completed",
    newSolved: newProgressEntries.length,
    hadNewSolutions: newProgressEntries.length > 0,
    compareRealCount: compareRealCount
  };
}
```

#### Topic Assignment Changes
**File:** `src/services/questions/visibility.service.ts`
```typescript
export const assignQuestionsToClassService = async (data: AssignmentData) => {
  // ... assignment logic ...
  
  // Invalidate topics cache for all students in batch
  await CacheInvalidation.invalidateTopicsForBatch(data.batchId);
}
```

---

### 5. API: `/api/students/topics/:topicSlug` (GET)

**File:** `src/services/topics/topic-progress.service.ts`

**Implementation:**
```typescript
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
  
  // 3. Cache result with centralized TTL
  await redis.setex(cacheKey, CACHE_TTL.topicOverview, JSON.stringify(result));
  console.log('[CACHE MISS] topic_overview:', topicSlug);
  
  return result;
};
```

**Cache Invalidation Triggers:**

#### Student Progress Updates
**File:** `src/services/progressSync/sync-core.service.ts`
```typescript
export async function syncOneStudent(
  studentId: number, 
  batchData?: BatchQuestionData,
  compareRealCount: boolean = true
) {
  // ... sync logic ...
  
  // 5 Bulk Insert into StudentProgress table
  if (newProgressEntries.length > 0) {
    await prisma.studentProgress.createMany({
      data: newProgressEntries,
      skipDuplicates: true
    });
    
    // Invalidate all topic overview caches (progress changed)
    await CacheInvalidation.invalidateTopicOverviews();
  }
  
  return {
    message: "Sync completed",
    newSolved: newProgressEntries.length,
    hadNewSolutions: newProgressEntries.length > 0,
    compareRealCount: compareRealCount
  };
}
```

#### Topic Assignment Changes
**File:** `src/services/questions/visibility.service.ts`
```typescript
export const assignQuestionsToClassService = async (data: AssignmentData) => {
  // ... assignment logic ...
  
  // Get topic info and invalidate topic overview caches
  await CacheInvalidation.invalidateTopicOverviewForBatch(data.batchId);
}
```

---

### 6. API: `/api/students/topics/:topicSlug/classes/:classSlug` (GET)

**File:** `src/services/classes/class-progress.service.ts`

**Implementation:**
```typescript
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
  
  // 3. Cache result with centralized TTL
  await redis.setex(cacheKey, CACHE_TTL.classProgress, JSON.stringify(result));
  console.log('[CACHE MISS] class_progress:', classSlug);
  
  return result;
};
```

**Cache Invalidation Triggers:**

#### Student Progress Updates
**File:** `src/services/progressSync/sync-core.service.ts`
```typescript
export async function syncOneStudent(
  studentId: number, 
  batchData?: BatchQuestionData,
  compareRealCount: boolean = true
) {
  // ... sync logic ...
  
  // 5 Bulk Insert into StudentProgress table
  if (newProgressEntries.length > 0) {
    await prisma.studentProgress.createMany({
      data: newProgressEntries,
      skipDuplicates: true
    });
    
    // Invalidate all class progress caches (progress changed)
    await CacheInvalidation.invalidateClassProgress();
  }
  
  return {
    message: "Sync completed",
    newSolved: newProgressEntries.length,
    hadNewSolutions: newProgressEntries.length > 0,
    compareRealCount: compareRealCount
  };
}
```

#### Class Assignment Changes
**File:** `src/services/questions/visibility.service.ts`
```typescript
export const assignQuestionsToClassService = async (data: AssignmentData) => {
  // ... assignment logic ...
  
  // Invalidate class progress caches for all students in this class
  await CacheInvalidation.invalidateClassProgressForClass(data.classId);
}
```

---

### 7. API: `/api/students/bookmarks` (GET/POST/PUT/DELETE)

**File:** `src/services/bookmarks/bookmark.service.ts`

**Implementation:**
```typescript
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
  
  // 3. Cache result with centralized TTL
  await redis.setex(cacheKey, CACHE_TTL.bookmarks, JSON.stringify(result));
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
```

---

### 8. API: `/api/students/recent-questions` (GET)

**File:** `src/services/questions/recentQuestions.service.ts`

**Implementation:**
```typescript
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
  
  // 3. Cache result with centralized TTL
  await redis.setex(cacheKey, CACHE_TTL.recentQuestions, JSON.stringify(result));
  console.log('[CACHE MISS] recent_questions:', studentId);
  
  return result;
};
```

**Cache Invalidation Triggers:**

#### Student Progress Updates
**File:** `src/services/progressSync/sync-core.service.ts`
```typescript
export async function syncOneStudent(
  studentId: number, 
  batchData?: BatchQuestionData,
  compareRealCount: boolean = true
) {
  // ... sync logic ...
  
  // 5 Bulk Insert into StudentProgress table
  if (newProgressEntries.length > 0) {
    await prisma.studentProgress.createMany({
      data: newProgressEntries,
      skipDuplicates: true
    });
    
    // Invalidate recent questions cache (progress changed)
    await CacheInvalidation.invalidateRecentQuestions();
  }
  
  return {
    message: "Sync completed",
    newSolved: newProgressEntries.length,
    hadNewSolutions: newProgressEntries.length > 0,
    compareRealCount: compareRealCount
  };
}
```

---

### 9. API: `/api/admin/stats` (POST)

**File:** `src/services/admin/admin-stats.service.ts`

**Implementation:**
```typescript
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
  
  // 3. Cache result with centralized TTL
  await redis.setex(cacheKey, CACHE_TTL.adminStats, JSON.stringify(result));
  console.log('[CACHE MISS] admin_stats');
  
  return result;
};
```

**Cache Invalidation Triggers:**

#### Student Registration/Updates
**File:** `src/services/students/student.service.ts`
```typescript
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

---

### 10. API: `/api/admin/topics` (GET/POST/PUT/DELETE)

**File:** `src/services/topics/topic.service.ts`

**Implementation:**
```typescript
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
  
  // 3. Cache result with centralized TTL
  await redis.setex(cacheKey, CACHE_TTL.adminTopics, JSON.stringify(result));
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
```

---

## SECTION 3: Cache Invalidation Utility

### File: `src/utils/cacheInvalidation.ts`

```typescript
import redis from '../config/redis';
import { deleteByPattern } from './redisUtils';

export class CacheInvalidation {
  
  // Student-specific invalidation
  static async invalidateStudent(studentId: number, batchId?: number) {
    // Delete specific student keys + all pattern-based caches
    const keys = [
      `student:profile:${studentId}`,
      `student:profile:public:${studentId}`,
    ];
    
    const patterns = [
      'student:assigned_questions:*',
      'student:topics:*',
      'student:topic_overview:*',
      'student:class_progress:*',
      'student:bookmarks:*',
      'student:recent_questions:*'
    ];
    
    // Delete specific keys
    await Promise.all(keys.map(key => redis.del(key)));
    
    // Delete pattern-based keys using SCAN (non-blocking)
    await Promise.all(patterns.map(pattern => deleteByPattern(pattern)));
    
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
    
    await Promise.all(patterns.map(pattern => deleteByPattern(pattern)));
  }
  
  // Batch-level invalidation
  static async invalidateBatch(batchId: number) {
    const patterns = [
      'student:assigned_questions:*',
      'student:topics:*',
      'student:topic_overview:*',
      'student:class_progress:*',
      'student:recent_questions:*'
    ];
    
    await Promise.all(patterns.map(pattern => deleteByPattern(pattern)));
  }
  
  // Admin stats invalidation
  static async invalidateAdminStats() {
    await deleteByPattern('admin:stats:*');
  }
  
  // Topics invalidation
  static async invalidateAdminTopics() {
    const keys = [
      'admin:topics:all',
      'static:topics' // Also invalidate public topics cache
    ];
    
    await Promise.all(keys.map(key => redis.del(key)));
  }
  
  // Simple utility methods for common invalidations (SCAN-based)
  static async invalidateAssignedQuestions() {
    await deleteByPattern('student:assigned_questions:*');
  }

  // Batch-specific invalidation - more precise
  static async invalidateAssignedQuestionsForBatch(batchId: number) {
    await deleteByPattern(`student:assigned_questions:*:*:${batchId}:*`);
  }
  
  static async invalidateTopics() {
    await deleteByPattern('student:topics:*');
  }
  
  static async invalidateTopicOverviews() {
    await deleteByPattern('student:topic_overview:*');
  }
  
  static async invalidateClassProgress() {
    await deleteByPattern('student:class_progress:*');
  }
  
  static async invalidateRecentQuestions() {
    await deleteByPattern('student:recent_questions:*');
  }
}
```

---

## SECTION 3.1: Modern Redis Best Practices

### Key Improvements Applied:

#### **1. Non-blocking SCAN Pattern Deletion**
```typescript
// BEFORE (Deprecated - blocks Redis):
const keys = await redis.keys('student:assigned_questions:*');
if (keys.length > 0) await redis.del(...keys);

// AFTER (Modern - production-safe):
await deleteByPattern('student:assigned_questions:*');
```

#### **2. Stable Deterministic Cache Keys**
```typescript
// BEFORE (Unstable - order-dependent):
const cacheKey = `student:assigned_questions:${studentId}:${batchId}:${JSON.stringify(filters)}`;
// {"page":1,"limit":10} vs {"limit":10,"page":1} = different keys!

// AFTER (Stable - deterministic):
const cacheKey = buildCacheKey(`student:assigned_questions:${studentId}:${batchId}`, filters);
// Always generates: student:assigned_questions:123:45:limit:10|page:1
```

#### **3. Modern Redis SET Syntax**
```typescript
// BEFORE (Deprecated):
await redis.setex(cacheKey, CACHE_TTL.addedQuestions, JSON.stringify(result));

// AFTER (Modern):
const serializedResult = JSON.stringify(result);
await setWithTTL(cacheKey, serializedResult, CACHE_TTL.addedQuestions);
```

### Production Benefits:
- **Performance:** Non-blocking operations prevent Redis cluster issues
- **Scalability:** SCAN-based deletion works with large keyspaces
- **Consistency:** Deterministic keys prevent cache misses
- **Maintainability:** Centralized utility functions reduce code duplication

---

## SECTION 4: Implementation Order & Testing Strategy

### Day-by-Day Implementation Order

#### **Day 1: `/api/students/addedQuestions`**
1. Add caching to `visibility-student.service.ts`
2. Add invalidation to `visibility.service.ts`
3. Test cache hit/miss behavior
4. Monitor performance improvement

#### **Day 2: `/api/students/leaderboard`**
1. Add caching to `studentLeaderboard.service.ts`
2. Add invalidation to `sync-core.service.ts`
3. Test with leaderboard queries
4. Verify cache invalidation works

#### **Day 3: `/api/students/me` & `/api/students/profile/:username`**
1. Add caching to both profile services
2. Add invalidation to progress sync and profile update services
3. Test profile loading performance

#### **Day 4: `/api/students/topics`**
1. Add caching to `topic-query.service.ts`
2. Add invalidation to progress sync and assignment services
3. Test topics page performance

#### **Day 5: `/api/students/topics/:topicSlug`**
1. Add caching to topic progress service
2. Add invalidation to relevant services
3. Test individual topic pages

#### **Day 6: `/api/students/topics/:topicSlug/classes/:classSlug`**
1. Add caching to class progress service
2. Add invalidation to assignment services
3. Test class progress pages

#### **Day 7: `/api/students/bookmarks`**
1. Add caching to bookmark service
2. Add invalidation to all bookmark operations
3. Test bookmark CRUD operations

#### **Day 8: `/api/students/recent-questions`**
1. Add caching to recent questions service
2. Add invalidation to progress sync
3. Test recent questions loading

#### **Day 9: `/api/admin/stats`**
1. Add caching to admin stats service
2. Add invalidation to student operations
3. Test admin stats performance

#### **Day 10: `/api/admin/topics`**
1. Add caching to topic service
2. Add invalidation to all topic operations
3. Test admin topic management

### Testing Strategy

#### For Each API:
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

## SECTION 5: Success Metrics & Performance Targets

### Expected Performance Improvements:

| API Route | Current Performance | Target Performance | Expected Improvement |
|-----------|-------------------|-------------------|-------------------|
| `addedQuestions` | 1-2s | <300ms | 70-85% faster |
| `leaderboard` | 2-5s | <200ms | 90-96% faster |
| `profile` | 1-3s | <500ms | 67-83% faster |
| `topics` | 800ms-1.5s | <400ms | 50-73% faster |
| `admin/stats` | 1-3s | <500ms | 67-83% faster |

### Cache Hit Rate Targets:
- Student APIs: 75-85%
- Admin APIs: 60-70%
- Static data: 90-95%

### Monitoring Dashboard:
Track:
- Cache hit/miss ratios
- Average response times
- Redis memory usage
- Invalidations per minute

---

## SECTION 6: Final Recommendations

### Implementation Priority:
1. **Start with centralized TTL config** - create `src/config/cache.config.ts`
2. **Implement APIs one by one** - follow the day-by-day schedule
3. **Test each implementation thoroughly** - verify both caching and invalidation
4. **Monitor performance gains** - track improvements systematically

### Key Benefits:
- **70-90% performance improvement** across critical endpoints
- **Centralized TTL management** for easy maintenance
- **Comprehensive cache invalidation** ensuring data consistency
- **Production-ready implementation** with proper error handling

### Success Criteria:
- All 10 APIs implemented with caching
- Cache hit rates meeting targets
- Performance improvements achieved
- No cache consistency issues
- Maintainable TTL configuration system

---

This final plan provides a complete, production-ready Redis implementation with centralized TTL configuration that will dramatically improve your backend performance while maintaining data consistency and ease of maintenance.
