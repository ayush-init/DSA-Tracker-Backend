# DSA Tracker Cron Job System - Comprehensive Analysis

## Executive Summary

This document provides a comprehensive analysis of the DSA Tracker's cron job system, covering question visibility, leaderboard synchronization, student progress tracking, heatmap generation with freeze day logic, and the complete data flow between backend and frontend components.

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Cron Job Scheduler](#cron-job-scheduler)
3. [Student Progress Synchronization](#student-progress-synchronization)
4. [Question Visibility System](#question-visibility-system)
5. [Leaderboard Synchronization](#leaderboard-synchronization)
6. [Heatmap Generation with Freeze Day Logic](#heatmap-generation-with-freeze-day-logic)
7. [Database Schema and Optimizations](#database-schema-and-optimizations)
8. [Caching Strategy](#caching-strategy)
9. [Frontend Integration](#frontend-integration)
10. [Performance Optimizations](#performance-optimizations)
11. [Error Handling and Resilience](#error-handling-and-resilience)

---

## 1. System Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Cron Job Scheduler                        │
│                    (sync.job.ts)                             │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├─── Student Sync Cycle (4:16 PM daily)
               │    └─── BullMQ Queue
               │         └─── Worker Pool (3 concurrent)
               │              └─── sync-core.service.ts
               │                   ├─── LeetCode API
               │                   └─── GFG API
               │
               └─── Leaderboard Sync Cycle (4:11 PM daily)
                    └─── leaderboardWindow.service.ts
                         └─── sync-core.service.ts
                              └─── Streak Calculator
```

### Key Technologies

- **Cron Scheduler**: node-cron
- **Queue System**: BullMQ with Redis
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Rate Limiting**: bottleneck for external APIs

---

## 2. Cron Job Scheduler

### File: `src/jobs/sync.job.ts`

#### Student Sync Cron Job

**Schedule**: Currently set to `3 16 * * *` (4:16 PM daily)
**Original Schedule**: `0 5,14,20 * * *` (5 AM, 2 PM, 8 PM)

```typescript
cron.schedule("3 16 * * *", async () => {
  // Max 3 retry attempts with exponential backoff
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      // Check if sync is already running
      if (isSyncRunning()) {
        console.log(`[CRON] Sync already running, skipping this cycle`);
        return;
      }

      // Check if queue is empty before starting new sync
      const queueCount = await studentSyncQueue.count();
      if (queueCount > 0) {
        console.log(`[CRON] Queue not empty (${queueCount} jobs), skipping new sync`);
        return;
      }

      // Set sync status
      startSync();

      // Load all batch questions once per sync cycle (OPTIMIZATION)
      const batchQuestionsQuery = await prisma.$queryRaw`
        WITH CTE_BatchQuestions AS (
          SELECT DISTINCT 
            b.id AS batch_id, 
            q.id AS question_id, 
            q.question_link
          FROM "Batch" b
          JOIN "Class" c ON c.batch_id = b.id
          JOIN "QuestionVisibility" qv ON qv.class_id = c.id
          JOIN "Question" q ON q.id = qv.question_id
          WHERE EXISTS (
            SELECT 1 FROM "Student" s WHERE s.batch_id = b.id
          )
        )
        SELECT 
          batch_id,
          array_agg(question_id) as question_ids,
          array_agg(question_link) as question_links
        FROM CTE_BatchQuestions
        GROUP BY batch_id
      `;

      // Convert to Map and store in memory
      const batchQuestionsMap = new Map<number, { question_ids: number[]; question_links: string[] }>();
      batchQuestionsQuery.forEach(batch => {
        batchQuestionsMap.set(batch.batch_id, {
          question_ids: batch.question_ids || [],
          question_links: batch.question_links || []
        });
      });

      setBatchQuestions(batchQuestionsMap);

      // Get all students with batch assignments
      const students = await prisma.student.findMany({
        where: { batch_id: { not: null } },
        select: { id: true, batch_id: true }
      });

      // Add all students to queue in bulk
      const jobs = students.map(student => ({
        name: 'sync-student',
        data: { studentId: student.id, batchId: student.batch_id },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 }
        }
      }));

      await studentSyncQueue.addBulk(jobs);
      break;
    } catch (error) {
      attempt++;
      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
});
```

**Key Features**:
- **Sync Status Tracking**: Prevents concurrent sync cycles
- **Queue Check**: Ensures previous cycle is complete before starting new one
- **Batch Question Pre-loading**: Loads all batch questions into memory once per cycle (major optimization)
- **Bulk Job Addition**: Adds all students to queue in single operation
- **Retry Logic**: 3 attempts with exponential backoff (2s, 4s, 8s)

#### Leaderboard Sync Cron Job

**Schedule**: Currently set to `11 16 * * *` (4:11 PM daily)
**Original Schedule**: `0 9,18,23 * * *` (9 AM, 6 PM, 11 PM)

```typescript
cron.schedule("11 16 * * *", async () => {
  try {
    console.log("[CRON] Leaderboard sync cycle started");
    await tryRunLeaderboard();
    console.log("[CRON] Leaderboard sync cycle completed");
  } catch (error) {
    console.error("[CRON] Leaderboard sync failed:", error);
  }
});
```

**Key Features**:
- **Window Logic**: Waits for student sync to complete before running
- **Testing Mode**: Can bypass sync completion check for testing
- **Error Handling**: Logs failures without crashing

---

## 3. Student Progress Synchronization

### File: `src/workers/studentSync.worker.ts`

#### Worker Configuration

```typescript
export const studentSyncWorker = new Worker(
  'student-sync',
  async (job: Job<{ studentId: number; batchId: number }>) => {
    const { studentId, batchId } = job.data;

    // Get batch questions from memory store
    const batchData = getBatchQuestions(batchId);
    
    if (!batchData) {
      console.log(`[WORKER] No batch questions found for batch ${batchId}`);
      return;
    }

    // Add timeout safety (60 seconds)
    const result = await Promise.race([
      syncOneStudent(studentId, batchData),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Job timeout')), 60000)
      )
    ]);

    return { 
      status: "SUCCESS", 
      studentId, 
      newSolved: result.newSolved,
      skipped: !result.hadNewSolutions
    };
  },
  {
    connection: redisConnection,
    concurrency: 3  // Process 3 jobs concurrently
  }
);
```

**Key Features**:
- **Concurrency**: 3 workers processing jobs simultaneously
- **Timeout Protection**: 60-second timeout per job
- **Memory Store Access**: Uses pre-loaded batch questions from memory
- **Error Handling**: Distinguishes between API errors (skip) and system errors (retry)

### File: `src/services/progressSync/sync-core.service.ts`

#### Core Sync Logic

```typescript
export async function syncOneStudent(
  studentId: number, 
  batchData?: BatchQuestionData,
  compareRealCount: boolean = true
) {
  // 1. Load student + already solved progress
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      progress: { select: { question_id: true } }
    }
  });

  // 2. Build question map from batch data (OPTIMIZATION)
  const questionMap = new Map<string, number[]>();
  batchData.question_links.forEach((link, index) => {
    const questionId = batchData.question_ids[index];
    const slug = extractSlug(link);
    if (slug) {
      if (!questionMap.has(slug)) {
        questionMap.set(slug, []);
      }
      questionMap.get(slug)!.push(questionId);
    }
  });

  // 3. Already solved set to avoid duplicates
  const solvedSet = new Set(student.progress.map(p => p.question_id));
  const newProgressEntries: { student_id: number; question_id: number }[] = [];

  // 4. LEETCODE API INTEGRATION
  if (student.leetcode_id) {
    const lcData = await fetchLeetcodeData(student.leetcode_id);
    
    // Process only "Accepted" submissions
    lcData.submissions
      .filter(sub => sub.statusDisplay === "Accepted")
      .forEach(sub => {
        const questionIds = questionMap.get(sub.titleSlug);
        if (questionIds) {
          questionIds.forEach(questionId => {
            if (!solvedSet.has(questionId)) {
              newProgressEntries.push({
                student_id: student.id,
                question_id: questionId
              });
              solvedSet.add(questionId);
            }
          });
        }
      });

    // Always update real count
    await prisma.student.update({
      where: { id: student.id },
      data: {
        lc_total_solved: lcData.totalSolved,
        last_synced_at: new Date()
      }
    });
  }

  // 5. GFG API INTEGRATION (similar logic)
  if (student.gfg_id) {
    const gfgData = await fetchGfgData(student.gfg_id);
    
    gfgData.solvedSlugs.forEach(slug => {
      const questionIds = questionMap.get(slug);
      if (questionIds) {
        questionIds.forEach(questionId => {
          if (!solvedSet.has(questionId)) {
            newProgressEntries.push({
              student_id: student.id,
              question_id: questionId
            });
            solvedSet.add(questionId);
          }
        });
      }
    });

    await prisma.student.update({
      where: { id: student.id },
      data: {
        gfg_total_solved: gfgData.totalSolved,
        last_synced_at: new Date()
      }
    });
  }

  // 6. Bulk insert new progress entries
  if (newProgressEntries.length > 0) {
    await prisma.studentProgress.createMany({
      data: newProgressEntries,
      skipDuplicates: true
    });

    // Invalidate all affected caches
    await CacheInvalidation.invalidateAssignedQuestions();
    await CacheInvalidation.invalidateTopics();
    await CacheInvalidation.invalidateTopicOverviews();
    await CacheInvalidation.invalidateClassProgress();
    await CacheInvalidation.invalidateBookmarks();
    await CacheInvalidation.invalidateStudentProfile(studentId);
    await CacheInvalidation.invalidateAllStudentProfiles();
    await CacheInvalidation.invalidateAllLeaderboards();
    
    const meCacheKey = buildCacheKey(`student:me:${studentId}`, {});
    await redisConnection.del(meCacheKey);
  }

  return {
    message: "Sync completed",
    newSolved: newProgressEntries.length,
    hadNewSolutions: newProgressEntries.length > 0,
    compareRealCount
  };
}
```

**Key Optimizations**:
- **Pre-loaded Question Map**: No database queries during sync
- **Slug-based Matching**: Efficient question lookup
- **Duplicate Prevention**: Uses solvedSet to avoid duplicates
- **Bulk Insert**: Single database operation for all new progress
- **Comprehensive Cache Invalidation**: Ensures data consistency

### External API Services

#### File: `src/services/external/leetcode.service.ts`

```typescript
const leetcodeLimiter = new bottleneck.default({
  maxConcurrent: 1,    // Only 1 request at a time
  minTime: 300,        // 300ms between requests
});

export async function fetchLeetcodeData(username: string): Promise<LeetcodeResponse> {
  const response = await axios.post(
    "https://leetcode.com/graphql",
    {
      query: `
        query userProfileData($username: String!) {
          matchedUser(username: $username) {
            submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
              }
            }
          }
          recentSubmissionList(username: $username) {
            titleSlug
            statusDisplay
          }
        }
      `,
      variables: { username }
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Referer": "https://leetcode.com",
        "Origin": "https://leetcode.com"
      },
      timeout: 15000  // 15 second timeout
    }
  );

  const totalSolved = stats.find((s: any) => s.difficulty === "All")?.count || 0;

  return {
    totalSolved,
    submissions: data.recentSubmissionList
  };
}
```

**Rate Limiting**:
- 1 concurrent request
- 300ms minimum between requests
- 15-second timeout per request
- Handles 429 (rate limit) errors gracefully

---

## 4. Question Visibility System

### File: `src/services/questions/visibility.service.ts`

#### Question Assignment

```typescript
export const assignQuestionsToClassService = async ({
  batchId,
  topicSlug,
  classSlug,
  questions,
}: AssignQuestionsInput) => {
  // Find topic and class
  const topic = await prisma.topic.findUnique({ where: { slug: topicSlug } });
  const cls = await prisma.class.findFirst({
    where: {
      slug: classSlug,
      batch_id: batchId,
      topic_id: topic.id
    }
  });

  // Create visibility records
  const data = questions.map((q) => ({
    class_id: cls.id,
    question_id: q.question_id,
    type: q.type,
  }));

  await prisma.questionVisibility.createMany({
    data,
    skipDuplicates: true,
  });

  // Update batch question counts
  await updateBatchQuestionCounts(batchId);

  // Invalidate all affected caches
  await CacheInvalidation.invalidateAssignedQuestionsForBatch(batchId);
  await CacheInvalidation.invalidateTopicsForBatch(batchId);
  await CacheInvalidation.invalidateTopicOverviewsForBatch(batchId);
  await CacheInvalidation.invalidateClassProgressForBatch(batchId);
  await CacheInvalidation.invalidateBookmarks();
  await CacheInvalidation.invalidateAllStudentProfiles();
  await CacheInvalidation.invalidateAllLeaderboards();
  await CacheInvalidation.invalidateRecentQuestions();
};
```

#### Batch Question Count Update

```typescript
async function updateBatchQuestionCounts(batchId: number) {
  const aggregateQuery = `
    SELECT 
      q.level,
      COUNT(q.id) as count
    FROM "Class" c
    INNER JOIN "QuestionVisibility" qv ON c.id = qv.class_id
    INNER JOIN "Question" q ON qv.question_id = q.id
    WHERE c.batch_id = $1
    GROUP BY q.level
  `;

  const results = await prisma.$queryRawUnsafe(aggregateQuery, batchId);

  let hardCount = 0, mediumCount = 0, easyCount = 0;
  results.forEach(result => {
    const count = Number(result.count);
    switch (result.level) {
      case 'HARD': hardCount = count; break;
      case 'MEDIUM': mediumCount = count; break;
      case 'EASY': easyCount = count; break;
    }
  });

  await prisma.batch.update({
    where: { id: batchId },
    data: {
      hard_assigned: hardCount,
      medium_assigned: mediumCount,
      easy_assigned: easyCount
    }
  });
}
```

**Key Features**:
- **Single Aggregate Query**: Replaces nested loops for performance
- **Automatic Count Update**: Maintains batch question counts
- **Comprehensive Cache Invalidation**: Ensures data consistency across all affected endpoints

---

## 5. Leaderboard Synchronization

### File: `src/services/leaderboardSync/leaderboardWindow.service.ts`

#### Window Logic

```typescript
export async function tryRunLeaderboard(): Promise<void> {
  const MAX_WAIT = 20 * 60 * 1000; // 20 minutes
  const INTERVAL = 3 * 60 * 1000;   // 3 minutes
  let waited = 0;

  while (waited < MAX_WAIT) {
    const TESTING_MODE = true;
    
    // Check if sync is not running AND has completed at least once
    if (TESTING_MODE || (!isSyncRunning() && getSyncCompletionTime() !== null)) {
      try {
        console.log('[LEADERBOARD] Sync is complete, running leaderboard update');
        const result = await syncLeaderboardData();
        console.log(`[LEADERBOARD] Leaderboard sync completed successfully. Processed ${result.studentsProcessed} students`);
        return;
      } catch (error) {
        console.error('[LEADERBOARD] Leaderboard sync failed:', error);
        throw error;
      }
    } else {
      console.log(`[LEADERBOARD] Sync still running or not completed. Waiting ${INTERVAL / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, INTERVAL));
      waited += INTERVAL;
    }
  }

  console.log('[LEADERBOARD] Max wait time reached, skipping leaderboard cycle');
}
```

**Key Features**:
- **Dependency Management**: Waits for student sync to complete
- **Max Wait Time**: 20 minutes before giving up
- **Polling Interval**: Checks every 3 minutes
- **Testing Mode**: Can bypass sync completion check

### File: `src/services/leaderboardSync/sync-core.service.ts`

#### Leaderboard Calculation

```typescript
export const syncLeaderboardData = async () => {
  await prisma.$transaction(async (tx) => {
    // Step 1: Calculate student statistics
    const result = await tx.$queryRawUnsafe<any>(`
      WITH student_solves_all AS (
        SELECT
          sp.student_id,
          COUNT(*) FILTER (WHERE q.level='HARD') AS hard_solved,
          COUNT(*) FILTER (WHERE q.level='MEDIUM') AS medium_solved,
          COUNT(*) FILTER (WHERE q.level='EASY') AS easy_solved,
          COUNT(*) AS total_solved
        FROM "StudentProgress" sp
        JOIN "Question" q ON q.id = sp.question_id
        GROUP BY sp.student_id
      ),
      
      student_activity_dates AS (
        SELECT
          sp.student_id,
          ARRAY_AGG(DISTINCT DATE(sp.sync_at)) AS activity_dates
        FROM "StudentProgress" sp
        GROUP BY sp.student_id
      ),
      
      final_stats AS (
        SELECT
          s.id AS student_id,
          s.name,
          s.username,
          c.city_name,
          b.year AS batch_year,
          
          -- All-time counts
          COALESCE(ss_all.hard_solved,0) AS hard_solved,
          COALESCE(ss_all.medium_solved,0) AS medium_solved,
          COALESCE(ss_all.easy_solved,0) AS easy_solved,
          COALESCE(ss_all.total_solved,0) AS total_solved,
          
          -- Activity dates for streak calculation
          COALESCE(ad.activity_dates, ARRAY[]::DATE[]) AS activity_dates,
          
          -- Assigned counts from Batch table
          b.hard_assigned,
          b.medium_assigned,
          b.easy_assigned,
          
          -- Calculate completion percentages
          ROUND((COALESCE(ss_all.hard_solved,0)::numeric / NULLIF(b.hard_assigned,0) * 100), 2) AS hard_completion,
          ROUND((COALESCE(ss_all.medium_solved,0)::numeric / NULLIF(b.medium_assigned,0) * 100), 2) AS medium_completion,
          ROUND((COALESCE(ss_all.easy_solved,0)::numeric / NULLIF(b.easy_assigned,0) * 100), 2) AS easy_completion,
          
          -- Calculate all-time score
          ROUND(
            (COALESCE(ss_all.hard_solved,0)::numeric / NULLIF(b.hard_assigned,0) * 2000) +
            (COALESCE(ss_all.medium_solved,0)::numeric / NULLIF(b.medium_assigned,0) * 1500) +
            (COALESCE(ss_all.easy_solved,0)::numeric / NULLIF(b.easy_assigned,0) * 1000), 2
          ) AS alltime_score,
          
          -- Completion status for freeze logic
          CASE 
            WHEN (COALESCE(ss_all.hard_solved,0) + COALESCE(ss_all.medium_solved,0) + COALESCE(ss_all.easy_solved,0)) >= 
                 (b.hard_assigned + b.medium_assigned + b.easy_assigned)
                 AND (b.hard_assigned + b.medium_assigned + b.easy_assigned) > 0
            THEN true
            ELSE false
          END as completed_all_questions
          
        FROM "Student" s
        JOIN "Batch" b ON s.batch_id = b.id
        JOIN "City" c ON s.city_id = c.id
        LEFT JOIN student_solves_all ss_all ON ss_all.student_id = s.id
        LEFT JOIN student_activity_dates ad ON ad.student_id = s.id
        WHERE s.batch_id IS NOT NULL
      ),
      
      ranked_stats AS (
        SELECT
          *,
          -- All-time rankings
          ROW_NUMBER() OVER (
            PARTITION BY batch_year
            ORDER BY alltime_score DESC, hard_completion DESC, medium_completion DESC, easy_completion DESC, total_solved DESC
          ) as alltime_global_rank,
          ROW_NUMBER() OVER (
            PARTITION BY batch_year, city_name
            ORDER BY alltime_score DESC, hard_completion DESC, medium_completion DESC, easy_completion DESC, total_solved DESC
          ) as alltime_city_rank
        FROM final_stats
      )
      
      SELECT 
        student_id,
        hard_solved,
        medium_solved,
        easy_solved,
        activity_dates,
        completed_all_questions,
        alltime_global_rank,
        alltime_city_rank
      FROM ranked_stats
    `);

    // Step 2: Bulk upsert with streak calculation
    if (result.length > 0) {
      const values = result.map((row: any) => {
        const activityDates = (row.activity_dates || []).map((dateStr: string) => new Date(dateStr));
        
        const streaks = calculateStreakWithCompletionFreeze(
          activityDates, 
          row.student_id, 
          row.completed_all_questions || false
        );
        
        return `(${row.student_id}, ${row.hard_solved}, ${row.medium_solved}, ${row.easy_solved}, ${streaks.currentStreak}, ${streaks.maxStreak}, ${row.alltime_global_rank}, ${row.alltime_city_rank}, NOW())`;
      }).join(',');

      await tx.$executeRawUnsafe(`
        INSERT INTO "Leaderboard" (
          student_id, hard_solved, medium_solved, easy_solved, 
          current_streak, max_streak,
          alltime_global_rank, alltime_city_rank,
          last_calculated
        ) VALUES ${values}
        ON CONFLICT (student_id) DO UPDATE SET
          hard_solved = EXCLUDED.hard_solved,
          medium_solved = EXCLUDED.medium_solved,
          easy_solved = EXCLUDED.easy_solved,
          current_streak = EXCLUDED.current_streak,
          max_streak = EXCLUDED.max_streak,
          alltime_global_rank = EXCLUDED.alltime_global_rank,
          alltime_city_rank = EXCLUDED.alltime_city_rank,
          last_calculated = NOW()
      `);
    }
  });

  return {
    success: true,
    studentsProcessed: result.length,
    duration: totalTime
  };
};
```

**Scoring Formula**:
```
Score = (hard_solved / hard_assigned * 2000) +
       (medium_solved / medium_assigned * 1500) +
       (easy_solved / easy_assigned * 1000)
```

**Ranking Criteria** (in order):
1. All-time score (descending)
2. Hard completion percentage (descending)
3. Medium completion percentage (descending)
4. Easy completion percentage (descending)
5. Total solved (descending)

---

## 6. Heatmap Generation with Freeze Day Logic

### File: `src/services/students/profile-heatmap.service.ts`

#### Optimized Heatmap Building

```typescript
export const buildHeatmapOptimized = (input: HeatmapInput): HeatmapData[] => {
  const { startDate, endDate, assignedDates, submissionCounts, completedAll } = input;
  
  // Generate full date range
  const allDates = generateDateRange(startDate, endDate);
  
  // Build heatmap array - single pass O(d)
  const heatmap: HeatmapData[] = allDates.map(date => {
    const submissions = submissionCounts.get(date) || 0;
    
    if (submissions > 0) {
      // Student solved questions on this day
      return { date, count: submissions };
    }
    
    // No submissions - check if question was assigned
    if (!assignedDates.has(date)) {
      // No question assigned - freeze day or break day
      if (completedAll) {
        return { date, count: -1 }; // Freeze day
      } else {
        return { date, count: 0 }; // Break day
      }
    }
    
    // Question assigned but no submissions
    return { date, count: 0 };
  });
  
  // Sort descending by date (latest first)
  return heatmap.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
```

#### Batch-Level Assigned Dates (CACHED)

```typescript
export const fetchAssignedDates = async (batchId: number, startDate: Date): Promise<Set<string>> => {
  const startDateStr = normalizeDate(startDate);
  const cacheKey = cacheKeys.batchAssignedDates(batchId, startDateStr);
  
  // Check batch-level cache first (shared by ALL students in batch)
  const cached = await cacheService.get<string[]>(cacheKey);
  if (cached) {
    return new Set(cached);
  }
  
  // Fetch from DB only once per batch
  const result = await prisma.$queryRaw<{ date: string }[]>`
    SELECT DISTINCT DATE(qv.assigned_at) as date
    FROM "QuestionVisibility" qv
    JOIN "Class" c ON qv.class_id = c.id
    WHERE c.batch_id = ${batchId}
    AND qv.assigned_at >= ${startDateStr}::date
    AND qv.assigned_at IS NOT NULL
  `;
  
  const dates = result.map(r => normalizeDate(r.date));
  
  // Cache for 1 hour at batch level (batch assignments rarely change)
  await cacheService.set(cacheKey, dates, 3600);
  
  return new Set(dates);
};
```

#### Student-Level Submission Counts (CACHED)

```typescript
export const fetchSubmissionCounts = async (studentId: number, startDate: Date): Promise<Map<string, number>> => {
  const startDateStr = normalizeDate(startDate);
  const cacheKey = cacheKeys.studentSubmissionCounts(studentId, startDateStr);
  
  // Check student-level cache
  const cached = await cacheService.get<Array<[string, number]>>(cacheKey);
  if (cached) {
    return new Map(cached);
  }
  
  const result = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
    SELECT 
      DATE(sync_at) as date,
      COUNT(*) as count
    FROM "StudentProgress"
    WHERE student_id = ${studentId}
      AND sync_at >= ${startDateStr}::date
    GROUP BY DATE(sync_at)
  `;
  
  const counts = new Map<string, number>();
  for (const row of result) {
    counts.set(normalizeDate(row.date), Number(row.count));
  }
  
  // Cache for 5 minutes (student submissions change frequently)
  await cacheService.set(cacheKey, Array.from(counts.entries()), 300);
  
  return counts;
};
```

**Key Features**:
- **Batch-Level Caching**: All students in same batch share assigned dates cache (1 hour TTL)
- **Student-Level Caching**: Individual submission counts cached (5 minutes TTL)
- **Freeze Day Logic**: count = -1 for freeze days, count = 0 for inactive days
- **Completion Check**: Uses `completed_all_questions` flag for freeze logic

### File: `src/utils/streakCalculator.ts`

#### Streak Calculation with Completion Freeze

```typescript
export function calculateStreakWithCompletionFreeze(
  activityDates: Date[], 
  studentId: number,
  hasCompletedAllQuestions: boolean
): StreakResult {
  if (activityDates.length === 0) {
    return { currentStreak: 0, maxStreak: 0 };
  }

  // Sort dates in descending order (newest first)
  const sortedDates = activityDates.sort((a, b) => b.getTime() - a.getTime());
  
  // Convert to date strings (YYYY-MM-DD) in local timezone
  const dateStrings = sortedDates.map(date => {
    const localDate = new Date(date);
    return localDate.toLocaleDateString('en-CA');
  });
  
  // Remove duplicates (same day multiple submissions)
  const uniqueDates = [...new Set(dateStrings)];
  
  // Calculate current streak
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;
  
  const today = new Date().toLocaleDateString('en-CA');
  let expectedDate = new Date(today);
  
  // Check current streak from today backwards
  for (const dateStr of uniqueDates) {
    const expectedDateStr = expectedDate.toLocaleDateString('en-CA');
    
    if (dateStr === expectedDateStr) {
      currentStreak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      // No activity on expected day
      if (hasCompletedAllQuestions) {
        // Student completed all questions → FREEZE DAY (preserve streak)
        expectedDate.setDate(expectedDate.getDate() - 1);
        continue;
      } else {
        // Student has pending questions → BREAK STREAK
        break;
      }
    }
  }
  
  // Calculate max streak by going through all dates
  let previousDate: Date | null = null;
  
  for (let i = 0; i < uniqueDates.length; i++) {
    const currentDate = new Date(uniqueDates[i]);
    
    if (previousDate === null) {
      tempStreak = 1;
    } else {
      const daysDiff = Math.floor((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        tempStreak++;
      } else {
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 1;
      }
    }
    
    previousDate = currentDate;
  }
  
  maxStreak = Math.max(maxStreak, tempStreak);
  
  return {
    currentStreak,
    maxStreak
  };
}
```

**Freeze Day Logic**:
- If student has completed ALL assigned questions, days without activity are "freeze days" (streak preserved)
- If student has pending questions, days without activity break the streak

---

## 7. Database Schema and Optimizations

### Key Tables

#### Leaderboard Table

```sql
CREATE TABLE "Leaderboard" (
  student_id INTEGER PRIMARY KEY,
  
  -- Raw counts (calculated from StudentProgress)
  hard_solved INTEGER DEFAULT 0,
  medium_solved INTEGER DEFAULT 0,
  easy_solved INTEGER DEFAULT 0,
  
  -- Streak data (calculated from StudentProgress)
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  
  -- Calculated metrics (stored for performance)
  alltime_global_rank INTEGER,
  alltime_city_rank INTEGER,
  
  -- Metadata
  last_calculated TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_leaderboard_global_rank ON "Leaderboard"(alltime_global_rank);
CREATE INDEX idx_leaderboard_city_rank ON "Leaderboard"(alltime_city_rank);
CREATE INDEX idx_leaderboard_last_calculated ON "Leaderboard"(last_calculated);
```

#### QuestionVisibility Table

```sql
CREATE TABLE "QuestionVisibility" (
  id          INTEGER PRIMARY KEY,
  class_id    INTEGER,
  question_id INTEGER,
  type        VARCHAR(10) DEFAULT 'HOMEWORK',
  assigned_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(class_id, question_id)
);

-- Performance indexes
CREATE INDEX idx_question_visibility_class_batch ON "QuestionVisibility"(class_id, question_id, type);
CREATE INDEX idx_question_visibility_assignment_date ON "QuestionVisibility"(assigned_at, class_id);
CREATE INDEX idx_question_visibility_question_lookup ON "QuestionVisibility"(question_id, class_id);
```

#### StudentProgress Table

```sql
CREATE TABLE "StudentProgress" (
  id          INTEGER PRIMARY KEY,
  student_id  INTEGER,
  question_id INTEGER,
  sync_at     TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(student_id, question_id)
);

-- Performance indexes
CREATE INDEX idx_student_progress_composite ON "StudentProgress"(student_id, question_id, sync_at);
CREATE INDEX idx_student_progress_sync_date ON "StudentProgress"(sync_at, student_id);
CREATE INDEX idx_student_progress_question_lookup ON "StudentProgress"(question_id, student_id);
```

#### Batch Table

```sql
CREATE TABLE "Batch" (
  id              INTEGER PRIMARY KEY,
  batch_name      VARCHAR(50),
  year            INTEGER,
  city_id         INTEGER,
  easy_assigned   INTEGER DEFAULT 0,
  hard_assigned   INTEGER DEFAULT 0,
  medium_assigned INTEGER DEFAULT 0,
  
  UNIQUE(city_id, year, batch_name)
);

-- Performance indexes
CREATE INDEX idx_batch_year_city ON "Batch"(year, city_id, id);
```

### Key Optimizations

1. **Composite Indexes**: Multi-column indexes for common query patterns
2. **Batch Question Counts**: Pre-calculated counts stored in Batch table
3. **Leaderboard Upsert**: Uses ON CONFLICT for atomic updates
4. **CTE Queries**: Complex queries use Common Table Expressions for readability and performance

---

## 8. Caching Strategy

### Cache Invalidation System

File: `src/utils/cacheInvalidation.ts`

```typescript
export class CacheInvalidation {
  static async invalidateAssignedQuestions() { /* ... */ }
  static async invalidateTopics() { /* ... */ }
  static async invalidateTopicOverviews() { /* ... */ }
  static async invalidateClassProgress() { /* ... */ }
  static async invalidateBookmarks() { /* ... */ }
  static async invalidateStudentProfile(studentId: number) { /* ... */ }
  static async invalidateAllStudentProfiles() { /* ... */ }
  static async invalidateAllLeaderboards() { /* ... */ }
  static async invalidateRecentQuestions() { /* ... */ }
  static async invalidateAssignedQuestionsForBatch(batchId: number) { /* ... */ }
  static async invalidateTopicsForBatch(batchId: number) { /* ... */ }
  static async invalidateTopicOverviewsForBatch(batchId: number) { /* ... */ }
  static async invalidateClassProgressForBatch(batchId: number) { /* ... */ }
}
```

### Cache Levels

1. **Batch-Level Caching** (1 hour TTL):
   - Assigned dates for all students in a batch
   - Shared across all students in the same batch
   - Massive performance gain for heatmap generation

2. **Student-Level Caching** (5 minutes TTL):
   - Individual submission counts
   - Profile data
   - Recent questions

3. **Global Caching** (varies):
   - Leaderboard data
   - Topic progress
   - Class progress

### Cache Keys

```typescript
export const cacheKeys = {
  batchAssignedDates: (batchId: number, startDate: string) => 
    `batch:assigned_dates:${batchId}:${startDate}`,
  
  studentSubmissionCounts: (studentId: number, startDate: string) => 
    `student:submission_counts:${studentId}:${startDate}`,
  
  batchStartMonth: (batchId: number) => 
    `batch:start_month:${batchId}`
};
```

---

## 9. Frontend Integration

### Heatmap Component

File: `dsa-tracker-frontend/src/components/student/profile/ActivityHeatmap.tsx`

```typescript
export default function ActivityHeatmap({
  heatmap,
  currentStreak,
  maxStreak,
}: Props) {
  // Color mapping with freeze day support
  const getColor = (count: number) => {
    if (count === -1)
      return "bg-blue-100/50 border border-blue-200/50"; // Freeze day color

    if (count <= 0)
      return "bg-[var(--muted)] border border-[var(--border)]";

    if (count <= 2) return "bg-[rgba(204,255,0,0.2)]";
    if (count <= 5) return "bg-[rgba(204,255,0,0.4)]";
    if (count <= 10) return "bg-[rgba(204,255,0,0.7)]";

    return "bg-[var(--primary)]";
  };

  // Tooltip with freeze day detection
  const tooltipText = count === -1 
    ? `Freeze day on ${key} (no questions uploaded)` 
    : `${count} submissions on ${key}`;

  // Legend includes freeze day indicator
  <div className="w-[14px] h-[14px] bg-blue-100/50 border border-blue-200/50 rounded-[3px]" />
  <span>Freeze day</span>
}
```

### Leaderboard Service

File: `dsa-tracker-frontend/src/services/student/leaderboard.service.ts`

```typescript
export const studentLeaderboardService = {
  getLeaderboard: async (filters: { city?: string; year?: number; type?: string } = {}, search?: string) => {
    if (!isStudentToken()) {
      clearAuthTokens();
      throw new Error('Access denied. Students only.');
    }

    const requestBody = {
      ...filters,
      username: search // Backend expects 'username' in request body
    };
    
    const res = await apiClient.post('/api/students/leaderboard', requestBody);
    return res.data;
  }
};
```

### Data Flow

```
Backend (Cron Job) → Database → API Endpoints → Frontend Components
     ↓                    ↓              ↓                ↓
  Sync Progress      Leaderboard    GET /api/       Heatmap
  Update Stats      Table          students/       Component
                      ↑              leaderboard
                      |
                 Cache Layer
                 (Redis)
```

---

## 10. Performance Optimizations

### 1. Batch Question Pre-loading

**Before**: Each student sync queried database for batch questions
**After**: Load all batch questions once per sync cycle into memory

**Impact**: Reduces database queries from N (students) to 1 per cycle

### 2. Batch-Level Caching

**Before**: Each student queried database for assigned dates
**After**: All students in same batch share cached assigned dates

**Impact**: Reduces assigned date queries from N to 1 per batch per hour

### 3. Bulk Operations

**Before**: Individual inserts for each progress entry
**After**: Single bulk insert for all new progress entries

**Impact**: Reduces database round-trips significantly

### 4. Worker Concurrency

**Before**: Sequential processing
**After**: 3 workers processing jobs concurrently

**Impact**: 3x faster sync processing

### 5. Question Map Optimization

**Before**: Database queries during sync
**After**: Pre-built slug-to-question-IDs map in memory

**Impact**: O(1) question lookup during sync

### 6. Aggregate SQL Queries

**Before**: Multiple queries for batch question counts
**After**: Single aggregate query with GROUP BY

**Impact**: Single database round-trip for count updates

---

## 11. Error Handling and Resilience

### Sync Job Error Handling

```typescript
// Retry logic with exponential backoff
const maxRetries = 3;
let attempt = 0;

while (attempt < maxRetries) {
  try {
    // Sync logic
    break; // Success - exit loop
  } catch (error) {
    attempt++;
    const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

### Worker Error Handling

```typescript
// Timeout protection
const result = await Promise.race([
  syncOneStudent(studentId, batchData),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Job timeout')), 60000)
  )
]);

// API error handling (skip user)
if (error.message?.includes('Invalid LeetCode username') || 
    error.message?.includes('Invalid GFG handle')) {
  return { status: "ERROR", reason: "Invalid Platform Username" };
}

// System error handling (retry)
throw error; // Re-throw for BullMQ retry
```

### Leaderboard Window Logic

```typescript
// Wait for sync to complete (max 20 minutes)
const MAX_WAIT = 20 * 60 * 1000;
const INTERVAL = 3 * 60 * 1000;

while (waited < MAX_WAIT) {
  if (!isSyncRunning() && getSyncCompletionTime() !== null) {
    // Run leaderboard sync
    return;
  }
  await new Promise(resolve => setTimeout(resolve, INTERVAL));
  waited += INTERVAL;
}
```

### API Rate Limiting

```typescript
// LeetCode rate limiter
const leetcodeLimiter = new bottleneck.default({
  maxConcurrent: 1,
  minTime: 300, // 300ms between requests
});

// Handle 429 errors
if (error.response?.status === 429) {
  throw new ApiError(429, "LeetCode API rate limit exceeded");
}
```

---

## Summary

### Cron Job Schedule

| Job | Schedule | Purpose |
|-----|----------|---------|
| Student Sync | 4:16 PM daily | Sync student progress from LeetCode/GFG |
| Leaderboard Sync | 4:11 PM daily | Calculate rankings and streaks |

### Key Features

1. **Question Visibility**: Admins assign questions to classes, which determines student assignments
2. **Progress Sync**: Automatic sync from external APIs (LeetCode, GFG) with rate limiting
3. **Leaderboard**: Complex scoring formula with completion-based ranking
4. **Freeze Day Logic**: Preserves streak when no questions are uploaded
5. **Heatmap**: Visual activity tracking with freeze day indication
6. **Caching**: Multi-level caching strategy for performance
7. **Error Resilience**: Retry logic, timeouts, and graceful degradation

### Performance Metrics

- **Sync Throughput**: 3 concurrent workers
- **Cache Hit Rate**: High due to batch-level caching
- **Database Optimization**: Composite indexes, CTE queries, bulk operations
- **API Rate Limiting**: 300ms between LeetCode requests

### Data Flow

```
1. Admin assigns questions → QuestionVisibility table
2. Cron triggers student sync → BullMQ queue
3. Workers process jobs → External APIs (LeetCode/GFG)
4. Progress stored → StudentProgress table
5. Cache invalidation → Redis
6. Leaderboard sync → Leaderboard table
7. Frontend requests → API endpoints
8. Data cached → Redis
9. UI rendered → React components
```

---

## Files Modified/Referenced

### Backend
- `src/jobs/sync.job.ts` - Cron job scheduler
- `src/workers/studentSync.worker.ts` - Worker pool
- `src/queues/studentSync.queue.ts` - BullMQ queue configuration
- `src/services/progressSync/sync-core.service.ts` - Core sync logic
- `src/services/leaderboardSync/leaderboardWindow.service.ts` - Leaderboard window logic
- `src/services/leaderboardSync/sync-core.service.ts` - Leaderboard calculation
- `src/services/questions/visibility.service.ts` - Question assignment
- `src/services/students/profile-heatmap.service.ts` - Heatmap generation
- `src/services/external/leetcode.service.ts` - LeetCode API
- `src/services/external/gfg.service.ts` - GFG API
- `src/utils/streakCalculator.ts` - Streak calculation
- `src/utils/syncStatus.ts` - Sync status tracking
- `src/store/batchQuestions.store.ts` - In-memory batch questions
- `src/utils/cacheInvalidation.ts` - Cache invalidation
- `prisma/schema.prisma` - Database schema

### Frontend
- `src/components/student/profile/ActivityHeatmap.tsx` - Heatmap component
- `src/services/student/leaderboard.service.ts` - Leaderboard API calls

### Migrations
- `migrations/cleanup_and_new_leaderboard.sql` - Leaderboard table optimization
- `migrations/update_batch_assigned_questions.sql` - Batch question counts
- `migrations/strategy1_performance_indexes.sql` - Performance indexes

---

*Document generated on April 20, 2026*
