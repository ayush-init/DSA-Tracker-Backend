# Redis TTL Centralization Plan

## SECTION 1: Current TTL Usage (API-wise)

### Current TTL Values Found in Implementation Guide:

| API Endpoint | Current TTL (seconds) | TTL (minutes) | File Location |
|--------------|---------------------|---------------|---------------|
| `/api/students/addedQuestions` | 600 | 10 min | visibility-student.service.ts |
| `/api/students/leaderboard` | 300 | 5 min | studentLeaderboard.service.ts |
| `/api/students/me` | 900 | 15 min | profile-core.service.ts |
| `/api/students/profile/:username` | 900 | 15 min | profile-public.service.ts |
| `/api/students/topics` | 600 | 10 min | topic-query.service.ts |
| `/api/students/topics/:topicSlug` | 600 | 10 min | topic-progress.service.ts |
| `/api/students/topics/:topicSlug/classes/:classSlug` | 600 | 10 min | class-progress.service.ts |
| `/api/students/bookmarks` | 600 | 10 min | bookmark.service.ts |
| `/api/students/recent-questions` | 900 | 15 min | recentQuestions.service.ts |
| `/api/admin/stats` | 300 | 5 min | admin-stats.service.ts |
| `/api/admin/topics` | 1800 | 30 min | topic.service.ts |

### Current Usage Pattern:
```typescript
await redis.setex(cacheKey, 600, JSON.stringify(result)); // Hardcoded TTL
```

---

## SECTION 2: Centralized CACHE_TTL Object

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

## SECTION 3: API to TTL Mapping

### Complete API-to-TTL Mapping:

| API Endpoint | TTL Key | TTL Value | Rationale |
|--------------|---------|-----------|-----------|
| `/api/students/addedQuestions` | `addedQuestions` | 600s (10min) | Question assignments change moderately |
| `/api/students/leaderboard` | `leaderboard` | 300s (5min) | Rankings change frequently with progress |
| `/api/students/me` | `profile` | 900s (15min) | Profile data changes less frequently |
| `/api/students/profile/:username` | `profile` | 900s (15min) | Public profile data is stable |
| `/api/students/topics` | `topics` | 600s (10min) | Topic progress updates regularly |
| `/api/students/topics/:topicSlug` | `topicOverview` | 600s (10min) | Topic-specific progress changes |
| `/api/students/topics/:topicSlug/classes/:classSlug` | `classProgress` | 600s (10min) | Class progress updates often |
| `/api/students/bookmarks` | `bookmarks` | 600s (10min) | User bookmarks change moderately |
| `/api/students/recent-questions` | `recentQuestions` | 900s (15min) | Recent activity is less frequent |
| `/api/admin/stats` | `adminStats` | 300s (5min) | Admin stats change frequently |
| `/api/admin/topics` | `adminTopics` | 1800s (30min) | Admin topic data is static |

### Import Pattern for Services:
```typescript
import { CACHE_TTL, getCacheTTL } from '../config/cache.config';
```

---

## SECTION 4: Updated Plan Snippets

### Example Refactoring for Each API:

#### 1. `/api/students/addedQuestions`
**Before:**
```typescript
// 3. Cache result for 10 minutes
await redis.setex(cacheKey, 600, JSON.stringify(result));
```

**After:**
```typescript
// 3. Cache result with centralized TTL
await redis.setex(cacheKey, CACHE_TTL.addedQuestions, JSON.stringify(result));
```

#### 2. `/api/students/leaderboard`
**Before:**
```typescript
// 3. Cache result for 5 minutes (leaderboards change frequently)
await redis.setex(cacheKey, 300, JSON.stringify(result));
```

**After:**
```typescript
// 3. Cache result with centralized TTL
await redis.setex(cacheKey, CACHE_TTL.leaderboard, JSON.stringify(result));
```

#### 3. `/api/students/me` & `/api/students/profile/:username`
**Before:**
```typescript
// 3. Cache result for 15 minutes
await redis.setex(cacheKey, 900, JSON.stringify(result));
```

**After:**
```typescript
// 3. Cache result with centralized TTL
await redis.setex(cacheKey, CACHE_TTL.profile, JSON.stringify(result));
```

#### 4. `/api/students/topics`
**Before:**
```typescript
// 3. Cache result for 10 minutes
await redis.setex(cacheKey, 600, JSON.stringify(result));
```

**After:**
```typescript
// 3. Cache result with centralized TTL
await redis.setex(cacheKey, CACHE_TTL.topics, JSON.stringify(result));
```

#### 5. `/api/admin/stats`
**Before:**
```typescript
// 3. Cache result for 5 minutes (stats change frequently)
await redis.setex(cacheKey, 300, JSON.stringify(result));
```

**After:**
```typescript
// 3. Cache result with centralized TTL
await redis.setex(cacheKey, CACHE_TTL.adminStats, JSON.stringify(result));
```

#### 6. `/api/admin/topics`
**Before:**
```typescript
// 3. Cache result for 30 minutes
await redis.setex(cacheKey, 1800, JSON.stringify(result));
```

**After:**
```typescript
// 3. Cache result with centralized TTL
await redis.setex(cacheKey, CACHE_TTL.adminTopics, JSON.stringify(result));
```

### Complete Service Import Example:
```typescript
// In visibility-student.service.ts
import redis from '../config/redis';
import { CACHE_TTL } from '../config/cache.config';
import { CacheInvalidation } from '../utils/cacheInvalidation';

export const getAssignedQuestionsService = async (studentId: number, filters: any) => {
  const cacheKey = `student:assigned_questions:${studentId}:${JSON.stringify(filters)}`;
  
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('[CACHE HIT] assigned_questions:', studentId);
    return JSON.parse(cached);
  }
  
  const result = await executeAssignedQuestionsQuery(studentId, filters);
  
  // 3. Cache result with centralized TTL
  await redis.setex(cacheKey, CACHE_TTL.addedQuestions, JSON.stringify(result));
  console.log('[CACHE MISS] assigned_questions:', studentId);
  
  return result;
};
```

---

## SECTION 5: Final Recommendations

### 1. Implementation Strategy

**Phase 1: Setup Configuration**
- Create `src/config/cache.config.ts`
- Add centralized CACHE_TTL object
- Test configuration imports

**Phase 2: Refactor Services**
- Update all 11 API services one by one
- Replace hardcoded TTL values with CACHE_TTL keys
- Maintain existing caching logic

**Phase 3: Validation**
- Verify all TTL values are correctly applied
- Test cache expiration behavior
- Monitor performance impact

### 2. TTL Optimization Recommendations

**Current TTL Values Are Well-Optimized:**
- High-frequency data (leaderboard, stats): 5 minutes - appropriate
- Medium-frequency data (progress, questions): 10 minutes - appropriate  
- Low-frequency data (profiles): 15 minutes - appropriate
- Static data (admin topics): 30 minutes - appropriate

**No Changes Needed** - current TTL values reflect data change patterns correctly.

### 3. File Structure Recommendations

**Primary Configuration:**
```
src/config/cache.config.ts    # Main TTL configuration
```

**Service Updates (11 files):**
```
src/services/questions/visibility-student.service.ts
src/services/leaderboard/studentLeaderboard.service.ts
src/services/students/profile-core.service.ts
src/services/students/profile-public.service.ts
src/services/topics/topic-query.service.ts
src/services/topics/topic-progress.service.ts
src/services/classes/class-progress.service.ts
src/services/bookmarks/bookmark.service.ts
src/services/questions/recentQuestions.service.ts
src/services/admin/admin-stats.service.ts
src/services/topics/topic.service.ts
```

### 4. Benefits of Centralization

**Maintainability:**
- Single source of truth for TTL values
- Easy to adjust cache durations globally
- Type-safe TTL key usage

**Consistency:**
- Standardized TTL patterns across services
- Reduced human error in hardcoded values
- Clear documentation of cache behavior

**Flexibility:**
- Easy to add new APIs with appropriate TTL
- Simple to adjust for performance tuning
- Environment-specific TTL configurations possible

### 5. Migration Path

**Step 1:** Create configuration file
**Step 2:** Update services incrementally (1-2 per day)
**Step 3:** Test and validate each service
**Step 4:** Monitor cache performance post-migration

**Zero Downtime:** Changes are backward compatible and don't affect cache invalidation logic.

---

## Summary

This centralization plan converts the existing Redis implementation from hardcoded TTL values to a maintainable, type-safe configuration system while preserving all existing caching and invalidation logic. The current TTL values are already well-optimized and require no changes to the actual durations.
