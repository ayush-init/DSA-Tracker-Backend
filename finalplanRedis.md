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
  studentLeaderboard: 300,      // 5 minutes - API: /api/students/leaderboard (Student side)
  adminLeaderboard: 300,        // 5 minutes - API: /api/admin/leaderboard (Admin side)
  adminStats: 300,              // 5 minutes - API: /api/admin/stats (Admin side)
  
  // MEDIUM FREQUENCY CHANGES (10 minutes)
  // User activity data - progress, questions, bookmarks
  studentAssignedQuestions: 600,   // 10 minutes - API: /api/students/addedQuestions (Student side)
  studentTopics: 600,              // 10 minutes - API: /api/students/topics (Student side)
  studentTopicOverview: 600,       // 10 minutes - API: /api/students/topics/:topicSlug (Student side)
  studentClassProgress: 600,       // 10 minutes - API: /api/students/topics/:topicSlug/classes/:classSlug (Student side)
  studentBookmarks: 600,           // 10 minutes - API: /api/students/bookmarks (Student side)
  
  // LOW FREQUENCY CHANGES (15 minutes)
  // User profile data - changes less frequently
  studentProfile: 900,             // 15 minutes - API: /api/students/me (Student side)
  studentPublicProfile: 900,       // 15 minutes - API: /api/students/profile/:username (Student side)
  studentRecentQuestions: 900,     // 15 minutes - API: /api/students/recent-questions (Student side)
  
  // STATIC DATA (30 minutes)
  // Rarely changes - admin data, static content
  adminTopics: 1800,               // 30 minutes - API: /api/admin/topics (Admin side)
  
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

**Implementation (Modern Redis Patterns):**
```typescript
// In profile-core.service.ts
export const getStudentProfileService = async (studentId: number) => {
  // Generate stable deterministic cache key
  const cacheKey = buildCacheKey(`student:profile:${studentId}`, {});
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('=== REDIS CACHE HIT ===');
    console.log(`[CACHE HIT] student_profile for student ${studentId}`);
    console.log(`Cache Key: ${cacheKey}`);
    console.log(`Data Source: Redis Cache`);
    console.log('========================');
    return JSON.parse(cached);
  }
  
  console.log('=== DATABASE FETCH ===');
  console.log(`[CACHE MISS] student_profile for student ${studentId}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`Data Source: Database Query`);
  console.log('===================');
  
  // 2. Execute expensive profile assembly (existing logic)
  const result = await buildStudentProfile(studentId);
  
  // 3. Cache result with modern Redis SET syntax (avoid duplicate JSON.stringify)
  const serializedResult = JSON.stringify(result);
  await setWithTTL(cacheKey, serializedResult, CACHE_TTL.studentProfile);
  
  console.log('=== CACHE STORAGE ===');
  console.log(`[CACHE STORE] student_profile for student ${studentId}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`TTL: ${CACHE_TTL.studentProfile} seconds (${CACHE_TTL.studentProfile/60} minutes)`);
  console.log(`Data Source: Database Query -> Cached in Redis`);
  console.log('====================');
  
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
  
  // Generate stable deterministic cache key
  const cacheKey = buildCacheKey(`student:profile:public:${student.id}`, {});
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('=== REDIS CACHE HIT ===');
    console.log(`[CACHE HIT] public_profile for username ${username}`);
    console.log(`Cache Key: ${cacheKey}`);
    console.log(`Data Source: Redis Cache`);
    console.log('========================');
    return JSON.parse(cached);
  }
  
  console.log('=== DATABASE FETCH ===');
  console.log(`[CACHE MISS] public_profile for username ${username}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`Data Source: Database Query`);
  console.log('===================');
  
  // 2. Execute expensive profile assembly (existing logic)
  const result = await buildPublicStudentProfile(student.id);
  
  // 3. Cache result with modern Redis SET syntax (avoid duplicate JSON.stringify)
  const serializedResult = JSON.stringify(result);
  await setWithTTL(cacheKey, serializedResult, CACHE_TTL.studentPublicProfile);
  
  console.log('=== CACHE STORAGE ===');
  console.log(`[CACHE STORE] public_profile for username ${username}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`TTL: ${CACHE_TTL.studentPublicProfile} seconds (${CACHE_TTL.studentPublicProfile/60} minutes)`);
  console.log(`Data Source: Database Query -> Cached in Redis`);
  console.log('====================');
  
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
    
    // Invalidate caches when student progress changes
    await CacheInvalidation.invalidateStudentProfile(studentId); // Student profile affected
    await CacheInvalidation.invalidateAllStudentProfiles(); // All profiles (ranks changed)
    await CacheInvalidation.invalidateAllLeaderboards(); // Leaderboard ranks change
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
export const updateStudentDetailsService = async (id: number, body: StudentUpdateData) => {
  // ... update logic ...
  
  const updatedStudent = await prisma.student.update({
    where: { id },
    data: updateData
  });

  // Invalidate profile caches when student data changes
  await CacheInvalidation.invalidateStudentProfile(id); // Specific student profile
  await CacheInvalidation.invalidateAllStudentProfiles(); // All profiles (if public data changed)
  await CacheInvalidation.invalidateAllLeaderboards(); // Leaderboard data affected
  
  return updatedStudent;
}
```

#### Question Assignment Changes
**File:** `src/services/questions/visibility.service.ts`
```typescript
export const assignQuestionsToClassService = async (data: AssignmentData) => {
  // ... assignment logic ...
  
  // Invalidate all affected caches
  await CacheInvalidation.invalidateAssignedQuestionsForBatch(data.batchId);
  await CacheInvalidation.invalidateTopicsForBatch(data.batchId); // Topic question counts changed
  await CacheInvalidation.invalidateTopicOverviewsForBatch(data.batchId); // Topic overviews affected
  await CacheInvalidation.invalidateClassProgressForBatch(data.batchId); // Class progress affected
  await CacheInvalidation.invalidateClassProgressForClass(cls.id); // Specific class affected
  await CacheInvalidation.invalidateBookmarks(); // Bookmarks might reference questions
  await CacheInvalidation.invalidateAllStudentProfiles(); // Profile coding stats affected
  await CacheInvalidation.invalidateAllLeaderboards(); // Leaderboard ranks change
  
  return { assignedCount: questions.length };
};

export const removeQuestionFromClassService = async (data: RemoveQuestionInput) => {
  // ... removal logic ...
  
  // Invalidate all affected caches
  await CacheInvalidation.invalidateAssignedQuestionsForBatch(data.batchId);
  await CacheInvalidation.invalidateTopicsForBatch(data.batchId); // Topic question counts changed
  await CacheInvalidation.invalidateTopicOverviewsForBatch(data.batchId); // Topic overviews affected
  await CacheInvalidation.invalidateClassProgressForBatch(data.batchId); // Class progress affected
  await CacheInvalidation.invalidateClassProgressForClass(cls.id); // Specific class affected
  await CacheInvalidation.invalidateBookmarks(); // Bookmarks might reference questions
  await CacheInvalidation.invalidateAllStudentProfiles(); // Profile coding stats affected
  await CacheInvalidation.invalidateAllLeaderboards(); // Leaderboard ranks change
  
  return true;
}
```

#### Student Batch Changes
**File:** `src/services/students/student-batch.service.ts` (Need to create/find)
```typescript
export const changeStudentBatchService = async (studentId: number, newBatchId: number) => {
  // ... batch change logic ...
  
  // Invalidate all student-specific caches
  await CacheInvalidation.invalidateTopicsForStudent(studentId); // Topics for new batch
  await CacheInvalidation.invalidateTopicOverviewsForStudent(studentId); // Topic overviews
  await CacheInvalidation.invalidateClassProgressForStudent(studentId); // Class progress
  await CacheInvalidation.invalidateBookmarksForStudent(studentId); // Bookmarks
  await CacheInvalidation.invalidateAssignedQuestionsForStudent(studentId); // Questions for new batch
  await CacheInvalidation.invalidateStudentProfile(studentId); // Profile batch data
  
  return true;
}
```

#### City/Batch Management Changes
**File:** `src/services/admin/city-batch-management.service.ts` (Need to create/find)
```typescript
export const updateCityService = async (cityId: number, updateData: UpdateCityData) => {
  // ... update logic ...
  
  // Invalidate all student profiles that reference this city
  await CacheInvalidation.invalidateAllStudentProfiles(); // City names changed
  
  return updatedCity;
};

export const updateBatchService = async (batchId: number, updateData: UpdateBatchData) => {
  // ... update logic ...
  
  // Invalidate all student profiles that reference this batch
  await CacheInvalidation.invalidateAllStudentProfiles(); // Batch data changed
  await CacheInvalidation.invalidateTopicsForBatch(batchId); // Topics affected
  await CacheInvalidation.invalidateTopicOverviewsForBatch(batchId); // Topic overviews affected
  
  return updatedBatch;
};
```

**File:** `src/services/students/profile.service.ts`
```typescript
export const updateStudentProfileData = async (
  studentId: number,
  { leetcode_id, gfg_id, github, linkedin, username }: any
) => {
  // ... update logic ...
  
  const updated = await prisma.student.update({
    where: { id: studentId },
    data: updateData,
    // ... select fields
  });

  // Invalidate leaderboard caches when student profile data changes
  await CacheInvalidation.invalidateAllLeaderboards();

  return updated;
}
```

#### Question Assignment Changes
**File:** `src/services/questions/visibility.service.ts`
```typescript
export const assignQuestionsToClassService = async (data: AssignmentData) => {
  // ... assignment logic ...
  
  // Invalidate assigned questions cache for this specific batch only
  await CacheInvalidation.invalidateAssignedQuestionsForBatch(data.batchId);
  
  // Invalidate all profile caches (batch data changed)
  await CacheInvalidation.invalidateAllStudentProfiles();
  
  return { assignedCount: questions.length };
};

export const removeQuestionFromClassService = async (data: RemoveQuestionInput) => {
  // ... removal logic ...
  
  // Invalidate assigned questions cache for this specific batch only
  await CacheInvalidation.invalidateAssignedQuestionsForBatch(data.batchId);
  
  // Invalidate all profile caches (batch data changed)
  await CacheInvalidation.invalidateAllStudentProfiles();
  
  return true;
}
```

#### Manual Leaderboard Sync
**File:** `src/services/leaderboardSync/sync-core.service.ts`
```typescript
export const calculateLeaderboard = async () => {
  // ... calculation logic ...
  
  // Invalidate all leaderboard caches
  await CacheInvalidation.invalidateAllLeaderboards();
  
  // Invalidate all profile caches (leaderboard data changed)
  await CacheInvalidation.invalidateAllStudentProfiles();
}
```

---

### 4. API: `/api/students/topics` (GET)

**File:** `src/services/topics/topic-progress.service.ts`

**Implementation (Modern Redis Patterns):**
```typescript
export const getTopicsWithBatchProgressService = async ({
  studentId,
  batchId,
  query
}: GetTopicsWithBatchProgressInput) => {
  // Generate stable deterministic cache key
  const cacheKey = buildCacheKey(`student:topics:${studentId}:${batchId}`, query || {});
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('=== REDIS CACHE HIT ===');
    console.log(`[CACHE HIT] student_topics for student ${studentId}`);
    console.log(`Cache Key: ${cacheKey}`);
    console.log(`Data Source: Redis Cache`);
    console.log('========================');
    return JSON.parse(cached);
  }
  
  console.log('=== DATABASE FETCH ===');
  console.log(`[CACHE MISS] student_topics for student ${studentId}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`Data Source: Database Query`);
  console.log('===================');
  
  // 2. Execute expensive topic progress query (existing logic)
  const result = await executeTopicsWithProgressQuery(studentId, batchId, query);
  
  // 3. Cache result with modern Redis SET syntax (avoid duplicate JSON.stringify)
  const serializedResult = JSON.stringify(result);
  await setWithTTL(cacheKey, serializedResult, CACHE_TTL.studentTopics);
  
  console.log('=== CACHE STORAGE ===');
  console.log(`[CACHE STORE] student_topics for student ${studentId}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`TTL: ${CACHE_TTL.studentTopics} seconds (${CACHE_TTL.studentTopics/60} minutes)`);
  console.log(`Data Source: Database Query -> Cached in Redis`);
  console.log('====================');
  
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
    
    // Invalidate caches when student progress changes
    await CacheInvalidation.invalidateTopics(); // Topics progress changed
    await CacheInvalidation.invalidateTopicOverviews(); // Topic overviews affected
    await CacheInvalidation.invalidateAllLeaderboards(); // Leaderboard ranks change
  }
  
  return {
    message: "Sync completed",
    newSolved: newProgressEntries.length,
    hadNewSolutions: newProgressEntries.length > 0,
    compareRealCount: compareRealCount
  };
}
```

#### Question Assignment Changes
**File:** `src/services/questions/visibility.service.ts`
```typescript
export const assignQuestionsToClassService = async (data: AssignmentData) => {
  // ... assignment logic ...
  
  // Invalidate all affected caches
  await CacheInvalidation.invalidateAssignedQuestionsForBatch(data.batchId);
  await CacheInvalidation.invalidateTopicsForBatch(data.batchId); // Topic question counts changed
  await CacheInvalidation.invalidateTopicOverviewsForBatch(data.batchId); // Topic overviews affected
  await CacheInvalidation.invalidateAllStudentProfiles(); // Profile data affected
  
  return { assignedCount: questions.length };
};

export const removeQuestionFromClassService = async (data: RemoveQuestionInput) => {
  // ... removal logic ...
  
  // Invalidate all affected caches
  await CacheInvalidation.invalidateAssignedQuestionsForBatch(data.batchId);
  await CacheInvalidation.invalidateTopicsForBatch(data.batchId); // Topic question counts changed
  await CacheInvalidation.invalidateTopicOverviewsForBatch(data.batchId); // Topic overviews affected
  await CacheInvalidation.invalidateAllStudentProfiles(); // Profile data affected
  
  return true;
}
```

#### Topic Management Changes
**File:** `src/services/topics/topic-management.service.ts` (Need to create/find)
```typescript
export const createTopicService = async (topicData: CreateTopicData) => {
  // ... creation logic ...
  
  // Invalidate all topic-related caches
  await CacheInvalidation.invalidateTopics(); // New topic appears in lists
  await CacheInvalidation.invalidateAdminTopics(); // Admin topic list
  
  return createdTopic;
};

export const updateTopicService = async (topicId: number, updateData: UpdateTopicData) => {
  // ... update logic ...
  
  // Invalidate all topic-related caches
  await CacheInvalidation.invalidateTopics(); // Topic metadata changed
  await CacheInvalidation.invalidateTopicOverviews(); // Topic overviews affected
  await CacheInvalidation.invalidateAdminTopics(); // Admin topic list
  
  return updatedTopic;
};

export const deleteTopicService = async (topicId: number) => {
  // ... deletion logic ...
  
  // Invalidate all topic-related caches
  await CacheInvalidation.invalidateTopics(); // Topic removed from lists
  await CacheInvalidation.invalidateTopicOverviews(); // Topic overviews affected
  await CacheInvalidation.invalidateAdminTopics(); // Admin topic list
  
  return true;
}
```

#### Class Management Changes
**File:** `src/services/classes/class-management.service.ts` (Need to create/find)
```typescript
export const assignClassToTopicService = async (topicId: number, classId: number, batchId: number) => {
  // ... assignment logic ...
  
  // Invalidate topic caches (class count changed)
  await CacheInvalidation.invalidateTopicsForBatch(batchId);
  await CacheInvalidation.invalidateTopicOverviewsForBatch(batchId);
  
  return true;
};

export const removeClassFromTopicService = async (topicId: number, classId: number, batchId: number) => {
  // ... removal logic ...
  
  // Invalidate topic caches (class count changed)
  await CacheInvalidation.invalidateTopicsForBatch(batchId);
  await CacheInvalidation.invalidateTopicOverviewsForBatch(batchId);
  
  return true;
}
```

#### Student Batch Changes
**File:** `src/services/students/student-batch.service.ts` (Need to create/find)
```typescript
export const changeStudentBatchService = async (studentId: number, newBatchId: number) => {
  // ... batch change logic ...
  
  // Invalidate all student-specific caches
  await CacheInvalidation.invalidateTopicsForStudent(studentId); // Topics for new batch
  await CacheInvalidation.invalidateTopicOverviewsForStudent(studentId); // Topic overviews
  await CacheInvalidation.invalidateAssignedQuestionsForStudent(studentId); // Questions for new batch
  await CacheInvalidation.invalidateStudentProfile(studentId); // Profile batch data
  
  return true;
}
```

---

### 5. API: `/api/students/topics/:topicSlug` (GET)

**File:** `src/services/topics/topic-progress.service.ts`

**Implementation (Modern Redis Patterns):**
```typescript
export const getTopicOverviewWithClassesSummaryService = async ({
  studentId,
  batchId,
  topicSlug,
  query
}: GetTopicOverviewWithClassesSummaryInput) => {
  const page = parseInt(query?.page as string) || 1;
  const limit = parseInt(query?.limit as string) || 10;

  // Generate stable deterministic cache key
  const cacheKey = buildCacheKey(`student:topic_overview:${studentId}:${batchId}:${topicSlug}`, {
    page,
    limit
  });
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('=== REDIS CACHE HIT ===');
    console.log(`[CACHE HIT] topic_overview for topic ${topicSlug}`);
    console.log(`Cache Key: ${cacheKey}`);
    console.log(`Data Source: Redis Cache`);
    console.log('========================');
    return JSON.parse(cached);
  }
  
  console.log('=== DATABASE FETCH ===');
  console.log(`[CACHE MISS] topic_overview for topic ${topicSlug}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`Data Source: Database Query`);
  console.log('===================');
  
  // 2. Execute expensive topic overview query (existing logic)
  const result = await executeTopicOverviewQuery(studentId, batchId, topicSlug, page, limit);
  
  // 3. Cache result with modern Redis SET syntax (avoid duplicate JSON.stringify)
  const serializedResult = JSON.stringify(result);
  await setWithTTL(cacheKey, serializedResult, CACHE_TTL.studentTopicOverview);
  
  console.log('=== CACHE STORAGE ===');
  console.log(`[CACHE STORE] topic_overview for topic ${topicSlug}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`TTL: ${CACHE_TTL.studentTopicOverview} seconds (${CACHE_TTL.studentTopicOverview/60} minutes)`);
  console.log(`Data Source: Database Query -> Cached in Redis`);
  console.log('====================');
  
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
    
    // Invalidate caches when student progress changes
    await CacheInvalidation.invalidateTopics(); // Topics progress changed
    await CacheInvalidation.invalidateTopicOverviews(); // Topic overviews affected
    await CacheInvalidation.invalidateClassProgress(); // Class progress affected
    await CacheInvalidation.invalidateAllLeaderboards(); // Leaderboard ranks change
  }
  
  return {
    message: "Sync completed",
    newSolved: newProgressEntries.length,
    hadNewSolutions: newProgressEntries.length > 0,
    compareRealCount: compareRealCount
  };
}
```

#### Question Assignment Changes
**File:** `src/services/questions/visibility.service.ts`
```typescript
export const assignQuestionsToClassService = async (data: AssignmentData) => {
  // ... assignment logic ...
  
  // Invalidate all affected caches
  await CacheInvalidation.invalidateAssignedQuestionsForBatch(data.batchId);
  await CacheInvalidation.invalidateTopicsForBatch(data.batchId); // Topic question counts changed
  await CacheInvalidation.invalidateTopicOverviewsForBatch(data.batchId); // Topic overviews affected
  await CacheInvalidation.invalidateClassProgressForBatch(data.batchId); // Class progress affected
  await CacheInvalidation.invalidateAllStudentProfiles(); // Profile data affected
  
  return { assignedCount: questions.length };
};

export const removeQuestionFromClassService = async (data: RemoveQuestionInput) => {
  // ... removal logic ...
  
  // Invalidate all affected caches
  await CacheInvalidation.invalidateAssignedQuestionsForBatch(data.batchId);
  await CacheInvalidation.invalidateTopicsForBatch(data.batchId); // Topic question counts changed
  await CacheInvalidation.invalidateTopicOverviewsForBatch(data.batchId); // Topic overviews affected
  await CacheInvalidation.invalidateClassProgressForBatch(data.batchId); // Class progress affected
  await CacheInvalidation.invalidateAllStudentProfiles(); // Profile data affected
  
  return true;
}
```

#### Topic Management Changes
**File:** `src/services/topics/topic-management.service.ts` (Need to create/find)
```typescript
export const updateTopicService = async (topicId: number, updateData: UpdateTopicData) => {
  // ... update logic ...
  
  // Invalidate all topic-related caches
  await CacheInvalidation.invalidateTopics(); // Topic metadata changed
  await CacheInvalidation.invalidateTopicOverviews(); // Topic overviews affected
  await CacheInvalidation.invalidateAdminTopics(); // Admin topic list
  
  return updatedTopic;
};

export const deleteTopicService = async (topicId: number) => {
  // ... deletion logic ...
  
  // Invalidate all topic-related caches
  await CacheInvalidation.invalidateTopics(); // Topic removed from lists
  await CacheInvalidation.invalidateTopicOverviews(); // Topic overviews affected
  await CacheInvalidation.invalidateClassProgress(); // Class progress for deleted topic
  await CacheInvalidation.invalidateAdminTopics(); // Admin topic list
  
  return true;
}
```

#### Class Management Changes
**File:** `src/services/classes/class-management.service.ts` (Need to create/find)
```typescript
export const createClassService = async (classData: CreateClassData) => {
  // ... creation logic ...
  
  // Invalidate topic caches (class list changed)
  await CacheInvalidation.invalidateTopicsForBatch(classData.batchId);
  await CacheInvalidation.invalidateTopicOverviewsForBatch(classData.batchId);
  
  return createdClass;
};

export const updateClassService = async (classId: number, updateData: UpdateClassData) => {
  // ... update logic ...
  
  // Invalidate topic caches (class data changed)
  await CacheInvalidation.invalidateTopicsForBatch(updateData.batchId);
  await CacheInvalidation.invalidateTopicOverviewsForBatch(updateData.batchId);
  await CacheInvalidation.invalidateClassProgressForBatch(updateData.batchId);
  
  return updatedClass;
};

export const deleteClassService = async (classId: number, batchId: number) => {
  // ... deletion logic ...
  
  // Invalidate topic caches (class removed)
  await CacheInvalidation.invalidateTopicsForBatch(batchId);
  await CacheInvalidation.invalidateTopicOverviewsForBatch(batchId);
  await CacheInvalidation.invalidateClassProgressForBatch(batchId);
  
  return true;
}
```

#### Student Batch Changes
**File:** `src/services/students/student-batch.service.ts` (Need to create/find)
```typescript
export const changeStudentBatchService = async (studentId: number, newBatchId: number) => {
  // ... batch change logic ...
  
  // Invalidate all student-specific caches
  await CacheInvalidation.invalidateTopicsForStudent(studentId); // Topics for new batch
  await CacheInvalidation.invalidateTopicOverviewsForStudent(studentId); // Topic overviews
  await CacheInvalidation.invalidateClassProgressForStudent(studentId); // Class progress
  await CacheInvalidation.invalidateAssignedQuestionsForStudent(studentId); // Questions for new batch
  await CacheInvalidation.invalidateStudentProfile(studentId); // Profile batch data
  
  return true;
}
```

---

### 6. API: `/api/students/topics/:topicSlug/classes/:classSlug` (GET)

**File:** `src/services/topics/class-student.service.ts`

**Implementation (Modern Redis Patterns):**
```typescript
export const getClassDetailsWithFullQuestionsService = async ({
  studentId,
  batchId,
  topicSlug,
  classSlug,
  query
}: GetClassDetailsWithFullQuestionsInput) => {
  const page = parseInt(query?.page as string) || 1;
  const limit = parseInt(query?.limit as string) || 10;
  const filter = query?.filter as string;

  // Generate stable deterministic cache key
  const cacheKey = buildCacheKey(`student:class_progress:${studentId}:${batchId}:${topicSlug}:${classSlug}`, {
    page,
    limit,
    filter: filter || ''
  });
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('=== REDIS CACHE HIT ===');
    console.log(`[CACHE HIT] class_progress for class ${classSlug}`);
    console.log(`Cache Key: ${cacheKey}`);
    console.log(`Data Source: Redis Cache`);
    console.log('========================');
    return JSON.parse(cached);
  }
  
  console.log('=== DATABASE FETCH ===');
  console.log(`[CACHE MISS] class_progress for class ${classSlug}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`Data Source: Database Query`);
  console.log('===================');
  
  // 2. Execute expensive class progress query (existing logic)
  const result = await executeClassProgressQuery(studentId, batchId, topicSlug, classSlug, page, limit, filter);
  
  // 3. Cache result with modern Redis SET syntax (avoid duplicate JSON.stringify)
  const serializedResult = JSON.stringify(result);
  await setWithTTL(cacheKey, serializedResult, CACHE_TTL.studentClassProgress);
  
  console.log('=== CACHE STORAGE ===');
  console.log(`[CACHE STORE] class_progress for class ${classSlug}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`TTL: ${CACHE_TTL.studentClassProgress} seconds (${CACHE_TTL.studentClassProgress/60} minutes)`);
  console.log(`Data Source: Database Query -> Cached in Redis`);
  console.log('====================');
  
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
    
    // Invalidate caches when student progress changes
    await CacheInvalidation.invalidateAssignedQuestions(); // Questions list affected
    await CacheInvalidation.invalidateTopics(); // Topics progress changed
    await CacheInvalidation.invalidateTopicOverviews(); // Topic overviews affected
    await CacheInvalidation.invalidateClassProgress(); // Class progress affected
    await CacheInvalidation.invalidateBookmarks(); // Bookmark status affected
    await CacheInvalidation.invalidateAllLeaderboards(); // Leaderboard ranks change
  }
  
  return {
    message: "Sync completed",
    newSolved: newProgressEntries.length,
    hadNewSolutions: newProgressEntries.length > 0,
    compareRealCount: compareRealCount
  };
}
```

#### Question Assignment Changes
**File:** `src/services/questions/visibility.service.ts`
```typescript
export const assignQuestionsToClassService = async (data: AssignmentData) => {
  // ... assignment logic ...
  
  // Invalidate all affected caches
  await CacheInvalidation.invalidateAssignedQuestionsForBatch(data.batchId);
  await CacheInvalidation.invalidateTopicsForBatch(data.batchId); // Topic question counts changed
  await CacheInvalidation.invalidateTopicOverviewsForBatch(data.batchId); // Topic overviews affected
  await CacheInvalidation.invalidateClassProgressForBatch(data.batchId); // Class progress affected
  await CacheInvalidation.invalidateClassProgressForClass(data.classId); // Specific class affected
  await CacheInvalidation.invalidateAllStudentProfiles(); // Profile data affected
  
  return { assignedCount: questions.length };
};

export const removeQuestionFromClassService = async (data: RemoveQuestionInput) => {
  // ... removal logic ...
  
  // Invalidate all affected caches
  await CacheInvalidation.invalidateAssignedQuestionsForBatch(data.batchId);
  await CacheInvalidation.invalidateTopicsForBatch(data.batchId); // Topic question counts changed
  await CacheInvalidation.invalidateTopicOverviewsForBatch(data.batchId); // Topic overviews affected
  await CacheInvalidation.invalidateClassProgressForBatch(data.batchId); // Class progress affected
  await CacheInvalidation.invalidateClassProgressForClass(data.classId); // Specific class affected
  await CacheInvalidation.invalidateAllStudentProfiles(); // Profile data affected
  
  return true;
}
```

#### Class Management Changes
**File:** `src/services/classes/class-management.service.ts` (Need to create/find)
```typescript
export const updateClassService = async (classId: number, updateData: UpdateClassData) => {
  // ... update logic ...
  
  // Invalidate class progress caches (class metadata changed)
  await CacheInvalidation.invalidateClassProgressForClass(classId);
  await CacheInvalidation.invalidateTopicsForBatch(updateData.batchId); // Topic overview affected
  await CacheInvalidation.invalidateTopicOverviewsForBatch(updateData.batchId); // Topic overviews affected
  
  return updatedClass;
};

export const deleteClassService = async (classId: number, batchId: number) => {
  // ... deletion logic ...
  
  // Invalidate all class-related caches
  await CacheInvalidation.invalidateClassProgressForClass(classId); // Specific class removed
  await CacheInvalidation.invalidateClassProgressForBatch(batchId); // Batch class list affected
  await CacheInvalidation.invalidateTopicsForBatch(batchId); // Topic overview affected
  await CacheInvalidation.invalidateTopicOverviewsForBatch(batchId); // Topic overviews affected
  
  return true;
}
```

#### Topic Management Changes
**File:** `src/services/topics/topic-management.service.ts` (Need to create/find)
```typescript
export const updateTopicService = async (topicId: number, updateData: UpdateTopicData) => {
  // ... update logic ...
  
  // Invalidate all topic-related caches
  await CacheInvalidation.invalidateTopics(); // Topic metadata changed
  await CacheInvalidation.invalidateTopicOverviews(); // Topic overviews affected
  await CacheInvalidation.invalidateClassProgress(); // Class progress topic data affected
  await CacheInvalidation.invalidateAdminTopics(); // Admin topic list
  
  return updatedTopic;
};

export const deleteTopicService = async (topicId: number) => {
  // ... deletion logic ...
  
  // Invalidate all topic-related caches
  await CacheInvalidation.invalidateTopics(); // Topic removed from lists
  await CacheInvalidation.invalidateTopicOverviews(); // Topic overviews affected
  await CacheInvalidation.invalidateClassProgress(); // Class progress for deleted topic
  await CacheInvalidation.invalidateAdminTopics(); // Admin topic list
  
  return true;
}
```

#### Bookmark Operations
**File:** `src/services/bookmarks/bookmark.service.ts` (Need to create/find)
```typescript
export const addBookmarkService = async (studentId: number, questionId: number) => {
  // ... bookmark logic ...
  
  // Invalidate bookmark-related caches
  await CacheInvalidation.invalidateBookmarksForStudent(studentId);
  await CacheInvalidation.invalidateClassProgress(); // Class progress bookmark status affected
  
  return bookmark;
};

export const removeBookmarkService = async (studentId: number, questionId: number) => {
  // ... removal logic ...
  
  // Invalidate bookmark-related caches
  await CacheInvalidation.invalidateBookmarksForStudent(studentId);
  await CacheInvalidation.invalidateClassProgress(); // Class progress bookmark status affected
  
  return true;
}
```

#### Student Batch Changes
**File:** `src/services/students/student-batch.service.ts` (Need to create/find)
```typescript
export const changeStudentBatchService = async (studentId: number, newBatchId: number) => {
  // ... batch change logic ...
  
  // Invalidate all student-specific caches
  await CacheInvalidation.invalidateTopicsForStudent(studentId); // Topics for new batch
  await CacheInvalidation.invalidateTopicOverviewsForStudent(studentId); // Topic overviews
  await CacheInvalidation.invalidateClassProgressForStudent(studentId); // Class progress
  await CacheInvalidation.invalidateBookmarksForStudent(studentId); // Bookmarks
  await CacheInvalidation.invalidateAssignedQuestionsForStudent(studentId); // Questions for new batch
  await CacheInvalidation.invalidateStudentProfile(studentId); // Profile batch data
  
  return true;
}
```

---

### 7. API: `/api/students/bookmarks` (GET/POST/PUT/DELETE)

**File:** `src/services/bookmarks/bookmark-query.service.ts`

**Implementation (Modern Redis Patterns):**
```typescript
export const getBookmarksService = async (
  studentId: number,
  options: {
    page: number;
    limit: number;
    sort: 'recent' | 'old' | 'solved' | 'unsolved';
    filter: 'all' | 'solved' | 'unsolved';
  }
) => {
  const { page = 1, limit = 10, sort = 'recent', filter = 'all' } = options;

  // Generate stable deterministic cache key
  const cacheKey = buildCacheKey(`student:bookmarks:${studentId}`, {
    page,
    limit,
    sort,
    filter
  });
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('=== REDIS CACHE HIT ===');
    console.log(`[CACHE HIT] bookmarks for student ${studentId}`);
    console.log(`Cache Key: ${cacheKey}`);
    console.log(`Data Source: Redis Cache`);
    console.log('========================');
    return JSON.parse(cached);
  }
  
  console.log('=== DATABASE FETCH ===');
  console.log(`[CACHE MISS] bookmarks for student ${studentId}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`Data Source: Database Query`);
  console.log('===================');
  
  // 2. Execute bookmark query (existing logic)
  const result = await executeBookmarkQuery(studentId, options);
  
  // 3. Cache result with modern Redis SET syntax (avoid duplicate JSON.stringify)
  const serializedResult = JSON.stringify(result);
  await setWithTTL(cacheKey, serializedResult, CACHE_TTL.studentBookmarks);
  
  console.log('=== CACHE STORAGE ===');
  console.log(`[CACHE STORE] bookmarks for student ${studentId}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`TTL: ${CACHE_TTL.studentBookmarks} seconds (${CACHE_TTL.studentBookmarks/60} minutes)`);
  console.log(`Data Source: Database Query -> Cached in Redis`);
  console.log('====================');
  
  return result;
};

// For POST/PUT/DELETE operations - invalidate cache
export const addBookmarkService = async (studentId: number, data: BookmarkData) => {
  // ... add bookmark logic ...
  
  // Invalidate bookmarks cache for this student
  await CacheInvalidation.invalidateBookmarksForStudent(studentId);
  
  return result;
};

export const updateBookmarkService = async (studentId: number, bookmarkId: number, data: UpdateBookmarkData) => {
  // ... update bookmark logic ...
  
  // Invalidate bookmarks cache for this student
  await CacheInvalidation.invalidateBookmarksForStudent(studentId);
  
  return result;
};

export const deleteBookmarkService = async (studentId: number, bookmarkId: number) => {
  // ... delete bookmark logic ...
  
  // Invalidate bookmarks cache for this student
  await CacheInvalidation.invalidateBookmarksForStudent(studentId);
  
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
    
    // Invalidate caches when student progress changes
    await CacheInvalidation.invalidateAssignedQuestions(); // Questions list affected
    await CacheInvalidation.invalidateTopics(); // Topics progress changed
    await CacheInvalidation.invalidateTopicOverviews(); // Topic overviews affected
    await CacheInvalidation.invalidateClassProgress(); // Class progress affected
    await CacheInvalidation.invalidateBookmarks(); // Bookmark solved status affected
    await CacheInvalidation.invalidateAllLeaderboards(); // Leaderboard ranks change
  }
  
  return {
    message: "Sync completed",
    newSolved: newProgressEntries.length,
    hadNewSolutions: newProgressEntries.length > 0,
    compareRealCount: compareRealCount
  };
}
```

#### Question Assignment Changes
**File:** `src/services/questions/visibility.service.ts`
```typescript
export const assignQuestionsToClassService = async (data: AssignmentData) => {
  // ... assignment logic ...
  
  // Invalidate all affected caches
  await CacheInvalidation.invalidateAssignedQuestionsForBatch(data.batchId);
  await CacheInvalidation.invalidateTopicsForBatch(data.batchId); // Topic question counts changed
  await CacheInvalidation.invalidateTopicOverviewsForBatch(data.batchId); // Topic overviews affected
  await CacheInvalidation.invalidateClassProgressForBatch(data.batchId); // Class progress affected
  await CacheInvalidation.invalidateClassProgressForClass(cls.id); // Specific class affected
  await CacheInvalidation.invalidateBookmarks(); // Bookmarks might reference questions
  await CacheInvalidation.invalidateAllStudentProfiles(); // Profile data affected
  
  return { assignedCount: questions.length };
};

export const removeQuestionFromClassService = async (data: RemoveQuestionInput) => {
  // ... removal logic ...
  
  // Invalidate all affected caches
  await CacheInvalidation.invalidateAssignedQuestionsForBatch(data.batchId);
  await CacheInvalidation.invalidateTopicsForBatch(data.batchId); // Topic question counts changed
  await CacheInvalidation.invalidateTopicOverviewsForBatch(data.batchId); // Topic overviews affected
  await CacheInvalidation.invalidateClassProgressForBatch(data.batchId); // Class progress affected
  await CacheInvalidation.invalidateClassProgressForClass(cls.id); // Specific class affected
  await CacheInvalidation.invalidateBookmarks(); // Bookmarks might reference questions
  await CacheInvalidation.invalidateAllStudentProfiles(); // Profile data affected
  
  return true;
}
```

#### Question Management Changes
**File:** `src/services/questions/question-management.service.ts` (Need to create/find)
```typescript
export const updateQuestionService = async (questionId: number, updateData: UpdateQuestionData) => {
  // ... update logic ...
  
  // Invalidate question-related caches
  await CacheInvalidation.invalidateAssignedQuestions(); // Question metadata changed
  await CacheInvalidation.invalidateBookmarks(); // Bookmarks show question metadata
  await CacheInvalidation.invalidateClassProgress(); // Class progress shows question data
  
  return updatedQuestion;
};

export const deleteQuestionService = async (questionId: number) => {
  // ... deletion logic ...
  
  // Invalidate all question-related caches
  await CacheInvalidation.invalidateAssignedQuestions(); // Question removed
  await CacheInvalidation.invalidateBookmarks(); // Bookmarks might reference deleted question
  await CacheInvalidation.invalidateClassProgress(); // Class progress affected
  
  return true;
}
```

#### Student Batch Changes
**File:** `src/services/students/student-batch.service.ts` (Need to create/find)
```typescript
export const changeStudentBatchService = async (studentId: number, newBatchId: number) => {
  // ... batch change logic ...
  
  // Invalidate all student-specific caches
  await CacheInvalidation.invalidateTopicsForStudent(studentId); // Topics for new batch
  await CacheInvalidation.invalidateTopicOverviewsForStudent(studentId); // Topic overviews
  await CacheInvalidation.invalidateClassProgressForStudent(studentId); // Class progress
  await CacheInvalidation.invalidateBookmarksForStudent(studentId); // Bookmarks for new batch
  await CacheInvalidation.invalidateAssignedQuestionsForStudent(studentId); // Questions for new batch
  await CacheInvalidation.invalidateStudentProfile(studentId); // Profile batch data
  
  return true;
}
```

---

### 8. API: `/api/students/recent-questions` (GET)

**File:** `src/services/questions/recentQuestions.service.ts`

**Implementation (Modern Redis Patterns):**
```typescript
export const getRecentQuestionsService = async ({
  batchId,
  date,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT
}: GetRecentQuestionsInput) => {
  // Generate stable deterministic cache key
  const cacheKey = buildCacheKey(`student:recent_questions:${batchId}`, {
    date: date || 'today',
    page,
    limit
  });
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('=== REDIS CACHE HIT ===');
    console.log(`[CACHE HIT] recent_questions for batch ${batchId}`);
    console.log(`Cache Key: ${cacheKey}`);
    console.log(`Data Source: Redis Cache`);
    console.log('========================');
    return JSON.parse(cached);
  }
  
  console.log('=== DATABASE FETCH ===');
  console.log(`[CACHE MISS] recent_questions for batch ${batchId}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`Data Source: Database Query`);
  console.log('===================');
  
  // 2. Execute recent questions query (existing logic)
  const result = await executeRecentQuestionsQuery(batchId, date, page, limit);
  
  // 3. Cache result with modern Redis SET syntax (avoid duplicate JSON.stringify)
  const serializedResult = JSON.stringify(result);
  await setWithTTL(cacheKey, serializedResult, CACHE_TTL.studentRecentQuestions);
  
  console.log('=== CACHE STORAGE ===');
  console.log(`[CACHE STORE] recent_questions for batch ${batchId}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`TTL: ${CACHE_TTL.studentRecentQuestions} seconds (${CACHE_TTL.studentRecentQuestions/60} minutes)`);
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
  
  // Invalidate all affected caches
  await CacheInvalidation.invalidateAssignedQuestionsForBatch(data.batchId);
  await CacheInvalidation.invalidateTopicsForBatch(data.batchId); // Topic question counts changed
  await CacheInvalidation.invalidateTopicOverviewsForBatch(data.batchId); // Topic overviews affected
  await CacheInvalidation.invalidateClassProgressForBatch(data.batchId); // Class progress affected
  await CacheInvalidation.invalidateClassProgressForClass(cls.id); // Specific class affected
  await CacheInvalidation.invalidateBookmarks(); // Bookmarks might reference questions
  await CacheInvalidation.invalidateAllStudentProfiles(); // Profile coding stats affected
  await CacheInvalidation.invalidateAllLeaderboards(); // Leaderboard ranks change
  await CacheInvalidation.invalidateRecentQuestions(); // Recent questions list affected
  
  return { assignedCount: questions.length };
};

export const removeQuestionFromClassService = async (data: RemoveQuestionInput) => {
  // ... removal logic ...
  
  // Invalidate all affected caches
  await CacheInvalidation.invalidateAssignedQuestionsForBatch(data.batchId);
  await CacheInvalidation.invalidateTopicsForBatch(data.batchId); // Topic question counts changed
  await CacheInvalidation.invalidateTopicOverviewsForBatch(data.batchId); // Topic overviews affected
  await CacheInvalidation.invalidateClassProgressForBatch(data.batchId); // Class progress affected
  await CacheInvalidation.invalidateClassProgressForClass(cls.id); // Specific class affected
  await CacheInvalidation.invalidateBookmarks(); // Bookmarks might reference questions
  await CacheInvalidation.invalidateAllStudentProfiles(); // Profile coding stats affected
  await CacheInvalidation.invalidateAllLeaderboards(); // Leaderboard ranks change
  await CacheInvalidation.invalidateRecentQuestions(); // Recent questions list affected
  
  return true;
}
```

#### Question Management Changes
**File:** `src/services/questions/question-management.service.ts` (Need to create/find)
```typescript
export const updateQuestionService = async (questionId: number, updateData: UpdateQuestionData) => {
  // ... update logic ...
  
  // Invalidate question-related caches
  await CacheInvalidation.invalidateAssignedQuestions(); // Question metadata changed
  await CacheInvalidation.invalidateBookmarks(); // Bookmarks show question metadata
  await CacheInvalidation.invalidateClassProgress(); // Class progress shows question data
  await CacheInvalidation.invalidateRecentQuestions(); // Recent questions show question data
  
  return updatedQuestion;
};

export const deleteQuestionService = async (questionId: number) => {
  // ... deletion logic ...
  
  // Invalidate all question-related caches
  await CacheInvalidation.invalidateAssignedQuestions(); // Question removed
  await CacheInvalidation.invalidateBookmarks(); // Bookmarks might reference deleted question
  await CacheInvalidation.invalidateClassProgress(); // Class progress affected
  await CacheInvalidation.invalidateRecentQuestions(); // Recent questions affected
  
  return true;
}
```

#### Class Management Changes
**File:** `src/services/classes/class-management.service.ts` (Need to create/find)
```typescript
export const updateClassService = async (classId: number, updateData: UpdateClassData) => {
  // ... update logic ...
  
  // Invalidate class-related caches
  await CacheInvalidation.invalidateClassProgressForClass(classId); // Class progress affected
  await CacheInvalidation.invalidateRecentQuestions(); // Recent questions show class data
  
  return updatedClass;
};

export const deleteClassService = async (classId: number) => {
  // ... deletion logic ...
  
  // Invalidate all class-related caches
  await CacheInvalidation.invalidateClassProgressForClass(classId); // Class progress affected
  await CacheInvalidation.invalidateRecentQuestions(); // Recent questions affected
  
  return true;
}
```

#### Topic Management Changes
**File:** `src/services/topics/topic-management.service.ts` (Need to create/find)
```typescript
export const updateTopicService = async (topicId: number, updateData: UpdateTopicData) => {
  // ... update logic ...
  
  // Invalidate topic-related caches
  await CacheInvalidation.invalidateTopics(); // Topics data changed
  await CacheInvalidation.invalidateTopicOverviews(); // Topic overviews affected
  await CacheInvalidation.invalidateClassProgress(); // Class progress shows topic data
  await CacheInvalidation.invalidateRecentQuestions(); // Recent questions show topic data
  
  return updatedTopic;
};

export const deleteTopicService = async (topicId: number) => {
  // ... deletion logic ...
  
  // Invalidate all topic-related caches
  await CacheInvalidation.invalidateTopics(); // Topics removed
  await CacheInvalidation.invalidateTopicOverviews(); // Topic overviews affected
  await CacheInvalidation.invalidateClassProgress(); // Class progress affected
  await CacheInvalidation.invalidateRecentQuestions(); // Recent questions affected
  
  return true;
}
```

#### Student Batch Changes
**File:** `src/services/students/student-batch.service.ts` (Need to create/find)
```typescript
export const changeStudentBatchService = async (studentId: number, newBatchId: number) => {
  // ... batch change logic ...
  
  // Invalidate all student-specific caches
  await CacheInvalidation.invalidateTopicsForStudent(studentId); // Topics for new batch
  await CacheInvalidation.invalidateTopicOverviewsForStudent(studentId); // Topic overviews
  await CacheInvalidation.invalidateClassProgressForStudent(studentId); // Class progress
  await CacheInvalidation.invalidateBookmarksForStudent(studentId); // Bookmarks
  await CacheInvalidation.invalidateAssignedQuestionsForStudent(studentId); // Questions for new batch
  await CacheInvalidation.invalidateStudentProfile(studentId); // Profile batch data
  await CacheInvalidation.invalidateRecentQuestions(); // Recent questions for new batch
  
  return true;
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
