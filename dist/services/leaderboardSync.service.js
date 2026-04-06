"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncLeaderboardData = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const streakCalculator_1 = require("../utils/streakCalculator");
const syncLeaderboardData = async () => {
    const syncStart = Date.now();
    console.log("🔄 Starting leaderboard sync...");
    try {
        let result = [];
        // Use transaction for atomicity
        await prisma_1.default.$transaction(async (tx) => {
            const truncateStart = Date.now();
            // Step 1: Keep existing leaderboard data (remove TRUNCATE - use UPSERT instead)
            console.log(`Cleared existing leaderboard in ${Date.now() - truncateStart}ms`);
            const calculationStart = Date.now();
            // Step 2: Calculate and insert new data with time-based rankings
            result = await tx.$queryRawUnsafe(`

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
          
          -- Calculate completion percentages for all-time ranking
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
            console.log(`Calculated data for ${result.length} students in ${Date.now() - calculationStart}ms`);
            // Step 3: Bulk upsert new data with streak calculation
            if (result.length > 0) {
                const insertStart = Date.now();
                // DEBUG: Log result data
                console.log(`🔍 DEBUG: result.length = ${result.length}`);
                if (result.length > 0) {
                    // Handle BigInt serialization
                    const safeResult = JSON.parse(JSON.stringify(result[0], (key, value) => typeof value === 'bigint' ? value.toString() : value));
                    console.log(`🔍 DEBUG: First row data:`, JSON.stringify(safeResult, null, 2));
                }
                const values = result.map((row) => {
                    // Convert SQL DATE array to JavaScript Date array
                    const activityDates = (row.activity_dates || []).map((dateStr) => new Date(dateStr));
                    console.log(`🔍 DEBUG: Processing student ${row.student_id}, activity dates: ${activityDates.length}, completed_all_questions: ${row.completed_all_questions}`);
                    // Use shared batch stats logic for consistency
                    const streaks = (0, streakCalculator_1.calculateStreakWithCompletionFreeze)(activityDates, row.student_id, row.completed_all_questions || false);
                    console.log(`🔍 DEBUG: Calculated streaks for student ${row.student_id}:`, { currentStreak: streaks.currentStreak, maxStreak: streaks.maxStreak });
                    return `(${row.student_id}, ${row.hard_solved}, ${row.medium_solved}, ${row.easy_solved}, ${streaks.currentStreak}, ${streaks.maxStreak}, ${row.alltime_global_rank}, ${row.alltime_city_rank}, NOW())`;
                }).join(',');
                // DEBUG: Log the values string
                console.log(`🔍 DEBUG: VALUES string:`, values);
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
                console.log(`✅ Upserted ${result.length} student records in ${Date.now() - insertStart}ms`);
            }
        });
        const totalTime = Date.now() - syncStart;
        console.log(`🎉 Leaderboard sync completed successfully in ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
        return {
            success: true,
            studentsProcessed: result.length,
            duration: totalTime
        };
    }
    catch (error) {
        console.error("❌ Leaderboard sync failed:", error);
        throw error;
    }
};
exports.syncLeaderboardData = syncLeaderboardData;
