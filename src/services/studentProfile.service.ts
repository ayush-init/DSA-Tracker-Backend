import prisma from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { cacheService, cacheKeys } from "./cache.service";

/**
 * Date normalization to YYYY-MM-DD format
 */
const normalizeDate = (date: Date | string): string => {
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  return date.toISOString().split('T')[0];
};

/**
 * Generate date range array from start to end (inclusive)
 * All dates in YYYY-MM-DD format
 */
const generateDateRange = (startDate: Date, endDate: Date): string[] => {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  // Ensure we start at beginning of day
  current.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  while (current <= end) {
    dates.push(normalizeDate(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

/**
 * Build heatmap data in JavaScript by merging assigned dates and submission counts
 * Time complexity: O(d) where d = days in range
 */
interface HeatmapInput {
  startDate: Date;
  endDate: Date;
  assignedDates: Set<string>;
  submissionCounts: Map<string, number>;
  completedAll: boolean;
}

interface HeatmapData {
  date: string;
  count: number;
}

const buildHeatmapOptimized = (input: HeatmapInput): HeatmapData[] => {
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

/**
 * Fetch assigned dates for a batch using BATCH-LEVEL cache
 * All students in same batch share this data - massive performance gain
 * Uses index: QuestionVisibility(class_id, assigned_at)
 */
const fetchAssignedDates = async (batchId: number, startDate: Date): Promise<Set<string>> => {
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
  // All students in this batch will reuse this!
  await cacheService.set(cacheKey, dates, 3600);
  
  return new Set(dates);
};

/**
 * Fetch submission counts grouped by date with CACHING
 * Student's own submissions cached for 5 minutes
 * Uses index: StudentProgress(student_id, sync_at)
 */
const fetchSubmissionCounts = async (studentId: number, startDate: Date): Promise<Map<string, number>> => {
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
  // Convert Map to array for serialization
  await cacheService.set(cacheKey, Array.from(counts.entries()), 300);
  
  return counts;
};

/**
 * Get batch start month using the already-fetched assigned dates
 * This avoids a separate slow MIN() query
 */
const getBatchStartMonthFromDates = (assignedDates: Set<string>, batchYear: number | null): Date => {
  if (assignedDates.size === 0) {
    // Fallback to batch year or today
    return batchYear ? new Date(batchYear, 0, 1) : new Date();
  }
  
  // Find earliest date from assigned dates
  const dates = Array.from(assignedDates).sort();
  const earliestDate = new Date(dates[0]);
  
  // Return first day of that month
  return new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
};

/**
 * Legacy: Get batch start month (first question assignment date) - CACHED
 * Uses optimized query with index
 */
const getBatchStartMonth = async (batchId: number, batchYear?: number | null): Promise<Date> => {
  const cacheKey = cacheKeys.batchStartMonth(batchId);
  const cached = await cacheService.get<Date>(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const result = await prisma.$queryRaw<{ start_month: Date }[]>`
    SELECT DATE_TRUNC('month', MIN(qv.assigned_at)) as start_month
    FROM "QuestionVisibility" qv
    JOIN "Class" c ON qv.class_id = c.id
    WHERE c.batch_id = ${batchId}
    AND qv.assigned_at IS NOT NULL
  `;

  let startMonth: Date;
  if (!result.length || !result[0].start_month) {
    startMonth = batchYear ? new Date(batchYear, 0, 1) : new Date();
  } else {
    startMonth = new Date(result[0].start_month);
  }
  
  // Cache for 24 hours (batch start doesn't change)
  await cacheService.set(cacheKey, startMonth, 86400);
  
  return startMonth;
};

/**
 * Check if student completed all questions
 */
const hasCompletedAllQuestions = (
  batchCounts: { easy_assigned: number; medium_assigned: number; hard_assigned: number } | null,
  leaderboard: { easy_solved: number; medium_solved: number; hard_solved: number } | null
): boolean => {
  if (!batchCounts || !leaderboard) return false;
  
  const totalAssigned = batchCounts.easy_assigned + batchCounts.medium_assigned + batchCounts.hard_assigned;
  const totalSolved = leaderboard.easy_solved + leaderboard.medium_solved + leaderboard.hard_solved;
  
  return totalSolved >= totalAssigned && totalAssigned > 0;
};

/**
 * Check if any question was assigned today for the batch
 */
const hasQuestionToday = (assignedDates: Set<string>): boolean => {
  const today = normalizeDate(new Date());
  return assignedDates.has(today);
};

/**
 * Get student's solved count for today from submission counts
 */
const getTodayCount = (submissionCounts: Map<string, number>): number => {
  const today = normalizeDate(new Date());
  return submissionCounts.get(today) || 0;
};

export const getStudentProfileService = async (studentId: number) => {
  try {
    // 1️⃣ Get student basic info + leaderboard (single query with all relations)
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        enrollment_id: true,
        github: true,
        linkedin: true,
        leetcode_id: true,
        gfg_id: true,
        profile_image_url: true,
        batch_id: true,
        city: { select: { id: true, city_name: true } },
        batch: { select: { id: true, batch_name: true, year: true } },
        leaderboards: true,
        _count: { select: { progress: true } }
      }
    });

    if (!student) {
      throw new ApiError(400, "Student not found");
    }

    const batchId = student.batch_id!;
    const leaderboard = student.leaderboards;

    // 2️⃣ Parallel execution: Batch counts, Recent activity, Heatmap start month
    const [
      batchQuestionCounts,
      recentActivity,
      heatmapStartMonth
    ] = await Promise.all([
      prisma.batch.findUnique({
        where: { id: batchId },
        select: { easy_assigned: true, medium_assigned: true, hard_assigned: true, year: true }
      }),
      prisma.studentProgress.findMany({
        where: { student_id: studentId },
        include: {
          question: { select: { question_name: true, level: true, question_link: true } }
        },
        orderBy: { sync_at: "desc" },
        take: 5
      }),
      getBatchStartMonth(batchId, student.batch?.year)
    ]);

    // 3️⃣ Check cache for heatmap
    const startMonthISO = normalizeDate(heatmapStartMonth);
    const cacheKey = cacheKeys.heatmap(studentId, batchId, startMonthISO);
    let heatmap: HeatmapData[] | null = await cacheService.get<HeatmapData[]>(cacheKey);
    let assignedDates: Set<string> | null = null;
    let submissionCounts: Map<string, number> | null = null;

    if (!heatmap) {
      // 4️⃣ Fetch heatmap data sources in parallel
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 1); // Include today
      
      const [fetchedAssignedDates, fetchedSubmissionCounts] = await Promise.all([
        fetchAssignedDates(batchId, heatmapStartMonth),
        fetchSubmissionCounts(studentId, heatmapStartMonth)
      ]);
      
      assignedDates = fetchedAssignedDates;
      submissionCounts = fetchedSubmissionCounts;
      
      // 5️⃣ Build heatmap in JavaScript
      const completedAll = hasCompletedAllQuestions(batchQuestionCounts, leaderboard);
      heatmap = buildHeatmapOptimized({
        startDate: heatmapStartMonth,
        endDate,
        assignedDates,
        submissionCounts,
        completedAll
      });
      
      // 6️⃣ Store in cache (5 minutes TTL)
      await cacheService.set(cacheKey, heatmap, 300);
    }

    // 7️⃣ Calculate today's stats
    const todayCount = submissionCounts ? getTodayCount(submissionCounts) : 0;
    const hasQuestionResult = assignedDates ? hasQuestionToday(assignedDates) : false;

    return {
      student: {
        name: student.name,
        username: student.username,
        email: student.email,
        enrollmentId: student.enrollment_id,
        city: student.city?.city_name || null,
        cityId: student.city?.id || null,
        batch: student.batch?.batch_name || null,
        batchId: student.batch?.id || null,
        year: student.batch?.year || null,
        github: student.github,
        linkedin: student.linkedin,
        leetcode: student.leetcode_id,
        gfg: student.gfg_id,
        profileImageUrl: student.profile_image_url
      },

      codingStats: {
        totalSolved: student._count.progress,
        totalAssigned: (batchQuestionCounts?.easy_assigned || 0) + (batchQuestionCounts?.medium_assigned || 0) + (batchQuestionCounts?.hard_assigned || 0),
        easy: {
          assigned: batchQuestionCounts?.easy_assigned || 0,
          solved: leaderboard?.easy_solved || 0
        },
        medium: {
          assigned: batchQuestionCounts?.medium_assigned || 0,
          solved: leaderboard?.medium_solved || 0
        },
        hard: {
          assigned: batchQuestionCounts?.hard_assigned || 0,
          solved: leaderboard?.hard_solved || 0
        }
      },

      streak: {
        currentStreak: leaderboard?.current_streak || 0,
        maxStreak: leaderboard?.max_streak || 0,
        count: todayCount,
        hasQuestion: hasQuestionResult
      },

      leaderboard: {
        globalRank: leaderboard?.alltime_global_rank || 0,
        cityRank: leaderboard?.alltime_city_rank || 0
      },

      heatmap: heatmap.map((h) => ({
        date: h.date,
        count: Number(h.count)
      })),

      heatmapStartMonth: startMonthISO,

      recentActivity: recentActivity.map((a) => ({
        question_name: a.question.question_name,
        question_link: a.question.question_link,
        difficulty: a.question.level,
        solvedAt: a.sync_at
      }))
    };

  } catch (error) {
    throw new ApiError(400, 
                    "Student profile retrieval failed: " +
                    (error instanceof Error ? error.message : String(error))
                );
  }
};


export const getPublicStudentProfileService = async (username: string) => {
  const startTime = Date.now();
  const timings: Record<string, number> = {};
  
  // 1️⃣ Get student basic info + leaderboard (single query with all relations)
  const t1 = Date.now();
  const student = await prisma.student.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      enrollment_id: true,
      github: true,
      linkedin: true,
      leetcode_id: true,
      gfg_id: true,
      profile_image_url: true,
      batch_id: true,
      city: { select: { id: true, city_name: true } },
      batch: { select: { id: true, batch_name: true, year: true } },
      leaderboards: true,
      _count: { select: { progress: true } }
    }
  });

  timings.studentQuery = Date.now() - t1;
  
  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  const studentId = student.id;
  const batchId = student.batch_id!;
  const leaderboard = student.leaderboards;

    // 2️⃣ Parallel execution: Batch counts, Recent activity, Assigned dates
    // Note: Skip getBatchStartMonth - we'll compute it from assigned dates
    const t2 = Date.now();
    const [
      batchQuestionCounts,
      recentActivity,
      assignedDatesForStartMonth
    ] = await Promise.all([
      prisma.batch.findUnique({
        where: { id: batchId },
        select: { easy_assigned: true, medium_assigned: true, hard_assigned: true, year: true }
      }),
      prisma.studentProgress.findMany({
        where: { student_id: studentId },
        include: {
          question: { select: { question_name: true, level: true, question_link: true } }
        },
        orderBy: { sync_at: "desc" },
        take: 5
      }),
      // Fetch ALL assigned dates to determine start month (avoids slow MIN() query)
      prisma.$queryRaw<{ date: string }[]>`
        SELECT DISTINCT DATE(qv.assigned_at) as date
        FROM "QuestionVisibility" qv
        JOIN "Class" c ON qv.class_id = c.id
        WHERE c.batch_id = ${batchId}
        AND qv.assigned_at IS NOT NULL
        ORDER BY DATE(qv.assigned_at) ASC
        LIMIT 1
      `
    ]);
    
    // Compute start month from first assigned date (avoids slow MIN() query)
    let heatmapStartMonth: Date;
    if (assignedDatesForStartMonth.length > 0 && assignedDatesForStartMonth[0].date) {
      const firstDate = new Date(assignedDatesForStartMonth[0].date);
      heatmapStartMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    } else {
      heatmapStartMonth = student.batch?.year 
        ? new Date(student.batch.year, 0, 1) 
        : new Date();
    }

  timings.parallelQueries = Date.now() - t2;

  // 3️⃣ Check cache for heatmap
  const t3 = Date.now();
  const startMonthISO = normalizeDate(heatmapStartMonth);
  const cacheKey = cacheKeys.heatmap(studentId, batchId, startMonthISO);
  let heatmap: HeatmapData[] | null = await cacheService.get<HeatmapData[]>(cacheKey);
  timings.cacheCheck = Date.now() - t3;

  if (!heatmap) {
    // 4️⃣ Fetch heatmap data sources in parallel
    const t4 = Date.now();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 1); // Include today
    
    const [assignedDates, submissionCounts] = await Promise.all([
      fetchAssignedDates(batchId, heatmapStartMonth),
      fetchSubmissionCounts(studentId, heatmapStartMonth)
    ]);
    timings.heatmapDataFetch = Date.now() - t4;
    
    // 5️⃣ Build heatmap in JavaScript
    const t5 = Date.now();
    const completedAll = hasCompletedAllQuestions(batchQuestionCounts, leaderboard);
    heatmap = buildHeatmapOptimized({
      startDate: heatmapStartMonth,
      endDate,
      assignedDates,
      submissionCounts,
      completedAll
    });
    timings.heatmapBuild = Date.now() - t5;
    
    // 6️⃣ Store in cache (5 minutes TTL)
    const t6 = Date.now();
    await cacheService.set(cacheKey, heatmap, 300);
    timings.cacheStore = Date.now() - t6;
  } else {
    timings.cacheHit = 1;
  }

  timings.total = Date.now() - startTime;
  console.log('[Profile API Timings]', timings);

  return {
    student: {
      id: student.id,
      name: student.name,
      username: student.username,
      enrollmentId: student.enrollment_id,
      city: student.city?.city_name || null,
      batch: student.batch?.batch_name || null,
      year: student.batch?.year || null,
      github: student.github,
      linkedin: student.linkedin,
      leetcode: student.leetcode_id,
      gfg: student.gfg_id,
      profileImageUrl: student.profile_image_url
    },
    codingStats: {
      totalSolved: student._count.progress,
      totalAssigned: (batchQuestionCounts?.easy_assigned || 0) + (batchQuestionCounts?.medium_assigned || 0) + (batchQuestionCounts?.hard_assigned || 0),
      easy: {
        assigned: batchQuestionCounts?.easy_assigned || 0,
        solved: leaderboard?.easy_solved || 0
      },
      medium: {
        assigned: batchQuestionCounts?.medium_assigned || 0,
        solved: leaderboard?.medium_solved || 0
      },
      hard: {
        assigned: batchQuestionCounts?.hard_assigned || 0,
        solved: leaderboard?.hard_solved || 0
      }
    },

    streak: {
      currentStreak: leaderboard?.current_streak || 0,
      maxStreak: leaderboard?.max_streak || 0
    },

    leaderboard: {
      globalRank: leaderboard?.alltime_global_rank || 0,
      cityRank: leaderboard?.alltime_city_rank || 0
    },

    heatmap: heatmap.map((h) => ({
      date: h.date,
      count: Number(h.count)
    })),

    heatmapStartMonth: startMonthISO,

    recentActivity: recentActivity.map((a) => ({
      question_name: a.question.question_name,
      question_link: a.question.question_link,
      difficulty: a.question.level,
      solvedAt: a.sync_at
    }))
  };
};

/**
 * Invalidate heatmap cache for a student
 * Call this when student solves a new question
 */
export const invalidateStudentHeatmapCache = async (studentId: number, batchId: number): Promise<void> => {
  const pattern = `heatmap:${studentId}:${batchId}:*`;
  await cacheService.delPattern(pattern);
};
