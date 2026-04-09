import prisma from "../../config/prisma";
import { cacheService, cacheKeys } from "../cache.service";

/**
 * Date normalization to YYYY-MM-DD format
 */
export const normalizeDate = (date: Date | string): string => {
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

/**
 * Fetch assigned dates for a batch using BATCH-LEVEL cache
 * All students in same batch share this data - massive performance gain
 * Uses index: QuestionVisibility(class_id, assigned_at)
 */
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
  // All students in this batch will reuse this!
  await cacheService.set(cacheKey, dates, 3600);
  
  return new Set(dates);
};

/**
 * Fetch submission counts grouped by date with CACHING
 * Student's own submissions cached for 5 minutes
 * Uses index: StudentProgress(student_id, sync_at)
 */
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
  // Convert Map to array for serialization
  await cacheService.set(cacheKey, Array.from(counts.entries()), 300);
  
  return counts;
};

/**
 * Get batch start month using the already-fetched assigned dates
 * This avoids a separate slow MIN() query
 */
export const getBatchStartMonthFromDates = (assignedDates: Set<string>, batchYear: number | null): Date => {
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
export const getBatchStartMonth = async (batchId: number, batchYear?: number | null): Promise<Date> => {
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
export const hasCompletedAllQuestions = (
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
export const hasQuestionToday = (assignedDates: Set<string>): boolean => {
  const today = normalizeDate(new Date());
  return assignedDates.has(today);
};

/**
 * Get student's solved count for today from submission counts
 */
export const getTodayCount = (submissionCounts: Map<string, number>): number => {
  const today = normalizeDate(new Date());
  return submissionCounts.get(today) || 0;
};

/**
 * Invalidate heatmap cache for a student
 * Call this when student solves a new question
 */
export const invalidateStudentHeatmapCache = async (studentId: number, batchId: number): Promise<void> => {
  const pattern = `heatmap:${studentId}:${batchId}:*`;
  await cacheService.delPattern(pattern);
};
