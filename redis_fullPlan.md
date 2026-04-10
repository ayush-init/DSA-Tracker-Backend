# Redis Caching Implementation Plan

## Executive Summary

This document provides a comprehensive Redis caching strategy for the DSA Tracker backend. The analysis shows that **Redis is partially configured** (BullMQ workers use it) but **no application-level caching** is implemented. 

**Current State:**
- ✅ Redis connection configured (`config/redis.ts`)
- ✅ BullMQ queues using Redis
- ✅ Basic cache service exists (in-memory only)
- ❌ **No Redis caching for application data**
- ❌ **No cache invalidation strategy**

**Expected Performance Impact:**
- Leaderboard queries: **70-90% faster**
- Static data lookups: **95% faster**
- Student profiles: **60-80% faster**
- Topic progress: **50-70% faster**

---

## 1. Cache Key Architecture

### 1.1 Key Naming Convention
```typescript
export const REDIS_KEYS = {
  // Leaderboard caching (HIGH PRIORITY)
  leaderboard: {
    admin: (city: string, year: number, page: number, limit: number) => 
      `lb:admin:${city}:${year}:${page}:${limit}`,
    student: (studentId: number, city: string, year: number) => 
      `lb:student:${studentId}:${city}:${year}`,
    top10: (city: string, year: number) => `lb:top10:${city}:${year}`,
    metadata: () => 'lb:metadata',
    cityYearMapping: () => 'lb:city_year_mapping'
  },
  
  // Student data caching (HIGH PRIORITY)
  student: {
    profile: (id: number) => `student:profile:${id}`,
    progress: (id: number, batchId: number) => `student:progress:${id}:${batchId}`,
    topics: (id: number, batchId: number) => `student:topics:${id}:${batchId}`,
    heatmap: (id: number, batchId: number, startMonth: string) => 
      `student:heatmap:${id}:${batchId}:${startMonth}`,
    bookmarks: (id: number) => `student:bookmarks:${id}`
  },
  
  // Static data caching (MEDIUM PRIORITY)
  static: {
    cities: () => 'static:cities',
    batches: () => 'static:batches', 
    topics: () => 'static:topics',
    questions: (batchId: number) => `static:questions:${batchId}`,
    batchQuestions: (batchId: number) => `static:batch_questions:${batchId}`
  },
  
  // Question data caching (MEDIUM PRIORITY)
  question: {
    visibility: (batchId: number, filters: string) => `questions:visibility:${batchId}:${filters}`,
    recent: (batchId: number) => `questions:recent:${batchId}`,
    assigned: (classId: number) => `questions:assigned:${classId}`
  },
  
  // Topic progress caching (LOW PRIORITY)
  topic: {
    progress: (studentId: number, batchId: number, topicId: number) => 
      `topic:progress:${studentId}:${batchId}:${topicId}`,
    overview: (studentId: number, batchId: number, topicSlug: string) => 
      `topic:overview:${studentId}:${batchId}:${topicSlug}`,
    classes: (batchId: number, topicSlug: string) => 
      `topic:classes:${batchId}:${topicSlug}`
  }
};
```

### 1.2 TTL Strategy
```typescript
export const CACHE_TTL = {
  // Fast-changing data (short TTL)
  leaderboard: 300,        // 5 minutes - ranks change frequently
  studentProgress: 180,     // 3 minutes - progress updates often
  questionVisibility: 600,   // 10 minutes - assignments change
  
  // Medium-changing data (medium TTL)
  studentProfile: 900,      // 15 minutes - profile updates
  topicProgress: 600,       // 10 minutes - progress calculations
  
  // Slow-changing data (long TTL)
  staticData: 3600,        // 1 hour - cities, batches, topics
  metadata: 1800,          // 30 minutes - city/year mappings
  questions: 1800           // 30 minutes - question data
};
```

---

## 2. Implementation Locations

### 2.1 Leaderboard Caching (HIGHEST PRIORITY)

**Files to Modify:**
- `src/services/leaderboard/adminLeaderboard.service.ts`
- `src/services/leaderboard/studentLeaderboard.service.ts`
- `src/services/leaderboard/leaderboard.shared.ts`

**Why Cache Here:**
- **Most performance-critical queries** (complex JOINs with calculations)
- **Heavy database load** - 5+ table joins per query
- **Frequent access** - every student and admin views leaderboards
- **Expensive calculations** - score calculations with divisions

**Implementation Strategy:**
```typescript
// In adminLeaderboard.service.ts
export async function getAdminLeaderboard(
  filters: Filters,
  pagination: Pagination,
  search?: string
): Promise<AdminLeaderboardResult> {
  const cacheKey = REDIS_KEYS.leaderboard.admin(
    filters.city || 'all', 
    filters.year || new Date().getFullYear(),
    pagination.page,
    pagination.limit
  );
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Execute expensive query
  const result = await executeLeaderboardQuery(filters, pagination, search);
  
  // Cache result
  await redis.setex(cacheKey, CACHE_TTL.leaderboard, JSON.stringify(result));
  
  return result;
}
```

### 2.2 Student Profile Caching (HIGH PRIORITY)

**Files to Modify:**
- `src/services/students/profile-core.service.ts`
- `src/services/students/profile-public.service.ts`

**Why Cache Here:**
- **Complex profile assembly** - multiple queries + data transformation
- **Frequent access** - profile viewed on every page load
- **Heavy queries** - leaderboard + progress + heatmap data
- **User experience critical** - profile load time affects UX

**Implementation Strategy:**
```typescript
// In profile-core.service.ts
export const getStudentProfileService = async (studentId: number) => {
  const cacheKey = REDIS_KEYS.student.profile(studentId);
  
  // Try cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Build profile (expensive operation)
  const profile = await buildStudentProfile(studentId);
  
  // Cache with medium TTL
  await redis.setex(cacheKey, CACHE_TTL.studentProfile, JSON.stringify(profile));
  
  return profile;
};
```

### 2.3 Static Data Caching (MEDIUM PRIORITY)

**Files to Modify:**
- `src/services/cities/city.service.ts`
- `src/services/batches/batch.service.ts`
- `src/services/topics/topic-query.service.ts`

**Why Cache Here:**
- **Rarely changes** - cities/batches/topics are static
- **High query frequency** - used in dropdowns everywhere
- **Simple queries** but **high volume**
- **Perfect cache candidates** - long TTL, low invalidation

**Implementation Strategy:**
```typescript
// In city.service.ts
export const getAllCitiesService = async () => {
  const cacheKey = REDIS_KEYS.static.cities();
  
  // Try cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from DB
  const cities = await prisma.city.findMany({
    orderBy: { created_at: "desc" }
  });
  
  // Cache for long time
  await redis.setex(cacheKey, CACHE_TTL.staticData, JSON.stringify(cities));
  
  return cities;
};
```

### 2.4 Question Visibility Caching (MEDIUM PRIORITY)

**Files to Modify:**
- `src/services/questions/visibility-student.service.ts`
- `src/services/questions/recentQuestions.service.ts`

**Why Cache Here:**
- **Complex filtering queries** - multiple JOINs + WHERE clauses
- **Heavy pagination** - large datasets with filtering
- **Frequent access** - students browse questions constantly
- **Expensive COUNT queries** for pagination

---

## 3. Cache Invalidation Strategy

### 3.1 Event-Based Invalidation

**Critical Principle:** Cache invalidation is MORE important than caching!

#### 3.1.1 Student Progress Updates
**Trigger:** Student solves a question, sync operation
**Files to Modify:**
- `src/services/progressSync/sync-core.service.ts`
- `src/controllers/progress.controller.ts`

**Invalidation Code:**
```typescript
// In sync-core.service.ts after progress update
export const syncOneStudent = async (studentId: number) => {
  // ... sync logic ...
  
  // Invalidate student-specific caches
  await invalidateStudentCaches(studentId);
  
  // Invalidate leaderboards (ranks changed)
  await invalidateLeaderboardCaches();
};

async function invalidateStudentCaches(studentId: number) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { batch_id: true }
  });
  
  if (!student) return;
  
  const patterns = [
    `student:profile:${studentId}`,
    `student:progress:${studentId}:*`,
    `student:topics:${studentId}:*`,
    `student:heatmap:${studentId}:*`,
    `student:bookmarks:${studentId}`
  ];
  
  await Promise.all(patterns.map(pattern => redis.del(pattern)));
}
```

#### 3.1.2 Question Assignment Changes
**Trigger:** Admin assigns/removes questions from classes
**Files to Modify:**
- `src/services/questions/visibility.service.ts`
- `src/controllers/questionVisibility.controller.ts`

**Invalidation Code:**
```typescript
// In visibility.service.ts after question assignment
export const assignQuestionsToClassService = async (data: AssignmentData) => {
  // ... assignment logic ...
  
  // Invalidate question caches
  await invalidateQuestionCaches(data.batchId, data.classId);
  
  // Invalidate static question data
  await redis.del(REDIS_KEYS.static.questions(data.batchId));
};

async function invalidateQuestionCaches(batchId: number, classId?: number) {
  const patterns = [
    `questions:visibility:${batchId}:*`,
    `questions:recent:${batchId}`,
    `questions:assigned:${classId || '*'}`
  ];
  
  await Promise.all(patterns.map(pattern => redis.del(pattern)));
}
```

#### 3.1.3 Leaderboard Sync Operations
**Trigger:** Daily leaderboard sync, manual sync
**Files to Modify:**
- `src/services/leaderboardSync/sync-core.service.ts`
- `src/jobs/sync.job.ts`

**Invalidation Code:**
```typescript
// In sync-core.service.ts after leaderboard calculation
export const calculateLeaderboard = async (batchId?: number) => {
  // ... calculation logic ...
  
  // Invalidate ALL leaderboard caches
  await invalidateAllLeaderboardCaches();
};

async function invalidateAllLeaderboardCaches() {
  const patterns = [
    'lb:admin:*',
    'lb:student:*', 
    'lb:top10:*',
    'lb:metadata',
    'lb:city_year_mapping'
  ];
  
  await Promise.all(patterns.map(pattern => redis.del(pattern)));
}
```

#### 3.1.4 Static Data Changes
**Trigger:** Admin creates/updates/deletes cities, batches, topics
**Files to Modify:**
- `src/services/cities/city.service.ts`
- `src/services/batches/batch.service.ts`
- `src/services/topics/topic.service.ts`

**Invalidation Code:**
```typescript
// In city.service.ts after city operations
export const createCityService = async (data: CityData) => {
  // ... creation logic ...
  
  // Invalidate static caches
  await redis.del(REDIS_KEYS.static.cities());
  await redis.del(REDIS_KEYS.leaderboard.cityYearMapping());
};

export const deleteCityService = async (cityId: number) => {
  // ... deletion logic ...
  
  // Invalidate static caches
  await redis.del(REDIS_KEYS.static.cities());
  await redis.del(REDIS_KEYS.leaderboard.cityYearMapping());
};
```

### 3.2 Pattern-Based Invalidation Utility

**Create:** `src/utils/cacheInvalidation.ts`

```typescript
import redis from '../config/redis';
import { REDIS_KEYS } from './cacheKeys';

export class CacheInvalidation {
  
  // Student-related invalidation
  static async invalidateStudent(studentId: number, batchId?: number) {
    const patterns = [
      REDIS_KEYS.student.profile(studentId),
      `student:progress:${studentId}:*`,
      `student:topics:${studentId}:*`,
      `student:heatmap:${studentId}:*`,
      `student:bookmarks:${studentId}`
    ];
    
    await Promise.all(patterns.map(pattern => redis.del(pattern)));
    
    // Also invalidate leaderboards (student rank changed)
    await this.invalidateLeaderboards();
  }
  
  // Leaderboard invalidation
  static async invalidateLeaderboards() {
    const patterns = [
      'lb:admin:*',
      'lb:student:*',
      'lb:top10:*',
      REDIS_KEYS.leaderboard.metadata(),
      REDIS_KEYS.leaderboard.cityYearMapping()
    ];
    
    await Promise.all(patterns.map(pattern => redis.del(pattern)));
  }
  
  // Question invalidation
  static async invalidateQuestions(batchId: number, classId?: number) {
    const patterns = [
      `questions:visibility:${batchId}:*`,
      REDIS_KEYS.questions.recent(batchId),
      REDIS_KEYS.questions.assigned(classId || '*'),
      REDIS_KEYS.static.questions(batchId)
    ];
    
    await Promise.all(patterns.map(pattern => redis.del(pattern)));
  }
  
  // Static data invalidation
  static async invalidateStaticData(type: 'cities' | 'batches' | 'topics') {
    const keys = [
      REDIS_KEYS.static[type]()
    ];
    
    // Also invalidate leaderboard metadata if cities/batches change
    if (type === 'cities' || type === 'batches') {
      keys.push(REDIS_KEYS.leaderboard.cityYearMapping());
    }
    
    await Promise.all(keys.map(key => redis.del(key)));
  }
  
  // Batch-level invalidation (when entire batch changes)
  static async invalidateBatch(batchId: number) {
    const patterns = [
      `student:progress:*:${batchId}`,
      `student:topics:*:${batchId}`,
      `student:heatmap:*:${batchId}`,
      `questions:visibility:${batchId}:*`,
      REDIS_KEYS.questions.recent(batchId),
      REDIS_KEYS.static.questions(batchId)
    ];
    
    await Promise.all(patterns.map(pattern => redis.del(pattern)));
  }
}
```

---

## 4. API Routes & Implementation Phases

### 4.1 Phase-Based API Route Mapping

#### **PHASE 1: Critical Performance APIs (Week 1)**
**Target: 70-90% performance improvement on most used endpoints**

| API Route | Method | Current Performance | Target Performance | Cache TTL | Files to Modify |
|-----------|---------|-------------------|-------------------|------------|-----------------|
| `/api/students/leaderboard` | POST | 2-5 seconds | <200ms | 5 min | `studentLeaderboard.service.ts` |
| `/api/admin/leaderboard` | POST | 2-5 seconds | <200ms | 5 min | `adminLeaderboard.service.ts` |
| `/api/students/me` | GET | 1-3 seconds | <500ms | 15 min | `profile-core.service.ts` |
| `/api/students/profile/:username` | GET | 1-3 seconds | <500ms | 15 min | `profile-public.service.ts` |
| `/api/students/bookmarks` | GET/POST/PUT/DELETE | 500ms-1s | <200ms | 10 min | `bookmark.controller.ts` |

**Implementation Order:**
1. **Day 1-2:** Leaderboard caching (biggest impact)
2. **Day 3-4:** Student profile caching  
3. **Day 5:** Basic invalidation setup

#### **PHASE 2: High Volume APIs (Week 2)**
**Target: 95% improvement on frequently accessed static data**

| API Route | Method | Current Performance | Target Performance | Cache TTL | Files to Modify |
|-----------|---------|-------------------|-------------------|------------|-----------------|
| `/api/cities` | GET | 200-500ms | <50ms | 1 hour | `city.controller.ts` |
| `/api/batches` | GET | 200-500ms | <50ms | 1 hour | `batch.controller.ts` |
| `/api/topics` | GET | 300-800ms | <100ms | 30 min | `topic.controller.ts` |
| `/api/students/addedQuestions` | GET | 1-2 seconds | <300ms | 10 min | `visibility-student.service.ts` |
| `/api/students/recent-questions` | GET | 500ms-1s | <200ms | 15 min | `recentQuestions.controller.ts` |

**Implementation Order:**
1. **Day 1-2:** Static data caching (cities, batches, topics)
2. **Day 3-4:** Question visibility caching
3. **Day 5:** Comprehensive invalidation

#### **PHASE 3: Optimization APIs (Week 3)**
**Target: Complete caching coverage for remaining endpoints**

| API Route | Method | Current Performance | Target Performance | Cache TTL | Files to Modify |
|-----------|---------|-------------------|-------------------|------------|-----------------|
| `/api/students/topics/:topicSlug` | GET | 800ms-1.5s | <400ms | 10 min | `topic.controller.ts` |
| `/api/students/topics/:topicSlug/classes/:classSlug` | GET | 1-2 seconds | <500ms | 10 min | `class.controller.ts` |
| `/api/admin/stats` | POST | 1-3 seconds | <500ms | 5 min | `admin-stats.service.ts` |
| `/api/admin/students` | GET | 1-2 seconds | <500ms | 5 min | `student-query.service.ts` |

### 4.2 Detailed Implementation Phases

#### **PHASE 1: Critical Performance Implementation**

**Day 1-2: Leaderboard Caching**
```typescript
// Files to modify:
// - src/services/leaderboard/adminLeaderboard.service.ts
// - src/services/leaderboard/studentLeaderboard.service.ts
// - src/services/leaderboard/leaderboard.shared.ts

// API Routes affected:
// POST /api/students/leaderboard
// POST /api/admin/leaderboard
```

**Day 3-4: Student Profile Caching**
```typescript
// Files to modify:
// - src/services/students/profile-core.service.ts
// - src/services/students/profile-public.service.ts
// - src/controllers/student.controller.ts

// API Routes affected:
// GET /api/students/me
// GET /api/students/profile/:username
```

**Day 5: Basic Invalidation**
```typescript
// Files to create:
// - src/utils/cacheInvalidation.ts
// - src/utils/cacheKeys.ts

// Files to modify:
// - src/services/progressSync/sync-core.service.ts
// - src/controllers/progress.controller.ts
```

#### **PHASE 2: High Volume Implementation**

**Day 1-2: Static Data Caching**
```typescript
// Files to modify:
// - src/services/cities/city.service.ts
// - src/services/batches/batch.service.ts  
// - src/services/topics/topic-query.service.ts
// - src/controllers/city.controller.ts
// - src/controllers/batch.controller.ts

// API Routes affected:
// GET /api/cities
// GET /api/batches  
// GET /api/topics
```

**Day 3-4: Question Visibility Caching**
```typescript
// Files to modify:
// - src/services/questions/visibility-student.service.ts
// - src/services/questions/recentQuestions.service.ts
// - src/controllers/questionVisibility.controller.ts

// API Routes affected:
// GET /api/students/addedQuestions
// GET /api/students/recent-questions
```

**Day 5: Advanced Invalidation**
```typescript
// Files to modify:
// - src/services/questions/visibility.service.ts
// - src/services/topics/topic.service.ts
// - src/controllers/admin.controller.ts
```

#### **PHASE 3: Complete Optimization**

**Day 1-2: Topic Progress Caching**
```typescript
// Files to modify:
// - src/services/topics/topic-progress.service.ts
// - src/controllers/topic.controller.ts

// API Routes affected:
// GET /api/students/topics/:topicSlug
// GET /api/students/topics/:topicSlug/classes/:classSlug
```

**Day 3-4: Admin APIs**
```typescript
// Files to modify:
// - src/services/admin/admin-stats.service.ts
// - src/services/students/student-query.service.ts
// - src/controllers/admin.controller.ts

// API Routes affected:
// POST /api/admin/stats
// GET /api/admin/students
```

**Day 5: Cache Warming & Monitoring**
```typescript
// Files to create:
// - src/services/cache-warming.service.ts
// - src/utils/cacheMetrics.ts

// Files to modify:
// - src/routes/admin.routes.ts (add debug endpoints)
```

### 4.3 Route-Specific Cache Strategies

#### 4.3.1 Authentication Routes (No Caching)
```
POST /api/auth/student/login     - NEVER CACHE (security)
POST /api/auth/admin/login       - NEVER CACHE (security)  
POST /api/auth/refresh-token    - NEVER CACHE (security)
POST /api/auth/forgot-password  - NEVER CACHE (security)
```

#### 4.3.2 Student Routes (High Priority Caching)
```
GET  /api/students/me              - CACHE 15min (profile data)
GET  /api/students/profile/:username  - CACHE 15min (public profile)
POST /api/students/leaderboard      - CACHE 5min  (rankings change)
GET  /api/students/topics             - CACHE 10min (progress data)
GET  /api/students/bookmarks          - CACHE 10min (user data)
POST /api/students/bookmarks          - INVALIDATE user bookmarks
```

#### 4.3.3 Admin Routes (Medium Priority Caching)
```
GET  /api/admin/cities              - CACHE 1hour (static data)
GET  /api/admin/batches              - CACHE 1hour (static data)
GET  /api/admin/topics               - CACHE 30min (topic data)
POST /api/admin/leaderboard          - CACHE 5min  (rankings)
POST /api/admin/stats                - CACHE 5min  (calculations)
```

#### 4.3.4 Public Routes (High Priority Caching)
```
GET  /api/cities                     - CACHE 1hour (static data)
GET  /api/batches                     - CACHE 1hour (static data)
GET  /api/topics                      - CACHE 30min (topic data)
GET  /api/topicprogress/:username      - CACHE 10min (progress)
```

### 4.4 Cache Hit Rate Targets

| Route Type | Current Hit Rate | Target Hit Rate | Impact |
|------------|------------------|-----------------|---------|
| Leaderboard APIs | 0% | 85% | Critical |
| Profile APIs | 0% | 75% | High |
| Static Data APIs | 0% | 95% | High |
| Question APIs | 0% | 70% | Medium |
| Admin APIs | 0% | 60% | Medium |

### 4.5 Implementation Priority Matrix

| Priority | API Routes | Performance Gain | Implementation Effort | Week |
|----------|-------------|------------------|---------------------|-------|
| **CRITICAL** | Leaderboard, Student Profile | 70-90% | 5 days | 1 |
| **HIGH** | Cities, Batches, Topics, Questions | 50-95% | 5 days | 2 |
| **MEDIUM** | Admin Stats, Topic Progress | 40-60% | 5 days | 3 |
| **LOW** | Cache Warming, Monitoring | Maintenance | 2 days | 3 |

---

## 5. Redis Configuration Updates

### 5.1 Environment Variables
Add to `.env`:
```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_TTL_LEADERBOARD=300
REDIS_TTL_STUDENT_PROFILE=900
REDIS_TTL_STATIC_DATA=3600
REDIS_CACHE_ENABLED=true
```

### 5.2 Update Cache Service
Modify `src/services/cache.service.ts`:
```typescript
import redis from '../config/redis';

class RedisCacheService {
  private redis = redis;
  
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || 300;
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
  
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
  
  async delPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

export const cacheService = new RedisCacheService();
```

---

## 6. Monitoring & Debugging

### 6.1 Cache Metrics
Add to `src/utils/cacheMetrics.ts`:
```typescript
export class CacheMetrics {
  static async logCacheHit(key: string, hit: boolean) {
    console.log(`[CACHE] ${hit ? 'HIT' : 'MISS'}: ${key}`);
  }
  
  static async getCacheStats() {
    const info = await redis.info('memory');
    const keyspace = await redis.info('keyspace');
    
    return {
      memory: info,
      keyspace: keyspace,
      timestamp: new Date().toISOString()
    };
  }
}
```

### 6.2 Cache Debugging Endpoint
Add to admin routes:
```typescript
// In admin.routes.ts
router.get("/cache/stats", async (req, res) => {
  const stats = await CacheMetrics.getCacheStats();
  res.json(stats);
});

router.post("/cache/clear", async (req, res) => {
  await redis.flushdb();
  res.json({ message: "Cache cleared" });
});
```

---

## 7. Testing Strategy

### 7.1 Unit Tests
```typescript
// tests/cache.test.ts
describe('Redis Caching', () => {
  test('should cache leaderboard results', async () => {
    const result1 = await getAdminLeaderboard(filters, pagination);
    const result2 = await getAdminLeaderboard(filters, pagination);
    
    // Second call should hit cache
    expect(result1).toEqual(result2);
  });
  
  test('should invalidate on progress update', async () => {
    await getStudentProfile(1);
    await updateStudentProgress(1, 123);
    
    // Should fetch fresh data after invalidation
    const profile = await getStudentProfile(1);
    expect(profile).toBeDefined();
  });
});
```

### 7.2 Load Testing
```bash
# Test leaderboard with and without cache
ab -n 1000 -c 10 http://localhost:5000/api/students/leaderboard
```

---

## 8. Rollback Strategy

### 8.1 Feature Flag
Add to `.env`:
```env
REDIS_CACHE_ENABLED=false  # Disable if issues
```

### 8.2 Fallback Logic
```typescript
// In cache service
export async function getCachedData<T>(key: string): Promise<T | null> {
  if (!process.env.REDIS_CACHE_ENABLED) {
    return null; // Always miss if disabled
  }
  
  try {
    return await cacheService.get<T>(key);
  } catch (error) {
    console.error('[CACHE] Error getting cache:', error);
    return null; // Fallback to DB
  }
}
```

---

## 9. Success Metrics

### 9.1 Performance Targets
- Leaderboard queries: **<200ms** (currently 2-5 seconds)
- Profile loads: **<500ms** (currently 1-3 seconds)
- Static data: **<50ms** (currently 200-500ms)
- Cache hit ratio: **>80%** for static data

### 9.2 Monitoring Dashboard
Track:
- Cache hit/miss ratios
- Average response times
- Redis memory usage
- Invalidations per minute

---

## 10. Implementation Checklist

### Week 1 Checklist
- [ ] Update cache service to use Redis
- [ ] Implement leaderboard caching
- [ ] Implement student profile caching  
- [ ] Create cache invalidation utility
- [ ] Add basic invalidation to progress updates
- [ ] Test with load testing

### Week 2 Checklist  
- [ ] Cache static data (cities, batches, topics)
- [ ] Cache question visibility queries
- [ ] Add comprehensive invalidation
- [ ] Add cache monitoring
- [ ] Performance testing

### Week 3 Checklist
- [ ] Cache topic progress
- [ ] Implement cache warming
- [ ] Add debugging endpoints
- [ ] Documentation and training
- [ ] Production deployment

---

## Conclusion

This Redis implementation will **dramatically improve performance** with minimal risk. The key is **proper invalidation** - cached data must be consistent with database.

**Start with Phase 1** for immediate performance gains, then progress through phases for complete optimization.

**Expected overall performance improvement: 60-80% faster response times** across the entire application.
