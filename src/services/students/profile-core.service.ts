import prisma from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import redis from "../../config/redis";
import { CACHE_TTL } from "../../config/cache.config";
import { buildCacheKey, setWithTTL } from "../../utils/redisUtils";
import { 
  buildHeatmapOptimized, 
  fetchAssignedDates, 
  fetchSubmissionCounts,
  getBatchStartMonth,
  hasCompletedAllQuestions,
  hasQuestionToday,
  getTodayCount,
  normalizeDate
} from "./profile-heatmap.service";

interface HeatmapData {
  date: string;
  count: number;
}

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

  try {
    // 1 Get student basic info + leaderboard (single query with all relations)
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

    // 2 Parallel execution: Batch counts, Recent activity, Heatmap start month
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

    // 3 Check cache for heatmap
    const startMonthISO = normalizeDate(heatmapStartMonth);
    const cacheKey = `student:heatmap:${studentId}:${batchId}:${startMonthISO}`;
    const cachedHeatmap = await redis.get(cacheKey);
    let heatmap: HeatmapData[] | null = cachedHeatmap ? JSON.parse(cachedHeatmap) : null;
    let assignedDates: Set<string> | null = null;
    let submissionCounts: Map<string, number> | null = null;

    if (!heatmap) {
      // 4 Fetch heatmap data sources in parallel
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 1); // Include today
      
      const [fetchedAssignedDates, fetchedSubmissionCounts] = await Promise.all([
        fetchAssignedDates(batchId, heatmapStartMonth),
        fetchSubmissionCounts(studentId, heatmapStartMonth)
      ]);
      
      assignedDates = fetchedAssignedDates;
      submissionCounts = fetchedSubmissionCounts;
      
      // 5 Build heatmap in JavaScript
      const completedAll = hasCompletedAllQuestions(batchQuestionCounts, leaderboard);
      heatmap = buildHeatmapOptimized({
        startDate: heatmapStartMonth,
        endDate,
        assignedDates,
        submissionCounts,
        completedAll
      });
      
      // 6 Store in cache (5 minutes TTL)
      await redis.setex(cacheKey, 300, JSON.stringify(heatmap));
    }

    // 7 Calculate today's stats
    const todayCount = submissionCounts ? getTodayCount(submissionCounts) : 0;
    const hasQuestionResult = assignedDates ? hasQuestionToday(assignedDates) : false;

    const result = {
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

  } catch (error) {
    throw new ApiError(400, 
                    "Student profile retrieval failed: " +
                    (error instanceof Error ? error.message : String(error))
                );
  }
};
