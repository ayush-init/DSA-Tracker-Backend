import prisma from "../config/prisma";
import { calculateStreakByActivity, calculateStreakWithFreeze, QuestionAvailability } from "../utils/streakCalculator";

export const syncLeaderboardData = async () => {
  const syncStart = Date.now();
  console.log("🔄 Starting leaderboard sync...");

  try {
    let result: any[] = [];
    
    // Use transaction for atomicity
    await prisma.$transaction(async (tx) => {
      const truncateStart = Date.now();
      // Step 1: Clear existing leaderboard
      await tx.$executeRaw`TRUNCATE TABLE "Leaderboard"`;
      console.log(`🧹 Cleared existing leaderboard in ${Date.now() - truncateStart}ms`);

      const calculationStart = Date.now();
      // Step 2: Calculate and insert new data with time-based rankings
      result = await tx.$queryRawUnsafe<any>(`
      WITH student_solves_all AS (
        SELECT
          sp.student_id,
          COUNT(*) FILTER (WHERE q.level='HARD')   AS hard_solved,
          COUNT(*) FILTER (WHERE q.level='MEDIUM') AS medium_solved,
          COUNT(*) FILTER (WHERE q.level='EASY')   AS easy_solved,
          COUNT(*) AS total_solved
        FROM "StudentProgress" sp
        JOIN "Question" q ON q.id = sp.question_id
        GROUP BY sp.student_id
      ),
            student_solves_weekly AS (
        SELECT
          sp.student_id,
          COUNT(*) FILTER (WHERE q.level='HARD')   AS hard_solved_weekly,
          COUNT(*) FILTER (WHERE q.level='MEDIUM') AS medium_solved_weekly,
          COUNT(*) FILTER (WHERE q.level='EASY')   AS easy_solved_weekly,
          COUNT(*) AS total_solved_weekly
        FROM "StudentProgress" sp
        JOIN "Question" q ON q.id = sp.question_id
        WHERE sp.sync_at >= date_trunc('week', now() - interval '1 day')
        GROUP BY sp.student_id
      ),
      student_solves_monthly AS (
        SELECT
          sp.student_id,
          COUNT(*) FILTER (WHERE q.level='HARD')   AS hard_solved_monthly,
          COUNT(*) FILTER (WHERE q.level='MEDIUM') AS medium_solved_monthly,
          COUNT(*) FILTER (WHERE q.level='EASY')   AS easy_solved_monthly,
          COUNT(*) AS total_solved_monthly
        FROM "StudentProgress" sp
        JOIN "Question" q ON q.id = sp.question_id
        WHERE sp.sync_at >= date_trunc('month', now())
        GROUP BY sp.student_id
      ),
      
      student_activity_dates AS (
        SELECT
          sp.student_id,
          array_agg(DATE(sp.sync_at) ORDER BY sp.sync_at DESC) AS activity_dates
        FROM "StudentProgress" sp
        GROUP BY sp.student_id
      ),
      
      question_availability AS (
        SELECT DISTINCT
          DATE(q.created_at) as date,
          true as has_question
        FROM "Question" q
        WHERE DATE(q.created_at) >= CURRENT_DATE - INTERVAL '365 days'
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
          
          -- Weekly counts
          COALESCE(ss_weekly.hard_solved_weekly,0) AS hard_solved_weekly,
          COALESCE(ss_weekly.medium_solved_weekly,0) AS medium_solved_weekly,
          COALESCE(ss_weekly.easy_solved_weekly,0) AS easy_solved_weekly,
          COALESCE(ss_weekly.total_solved_weekly,0) AS total_solved_weekly,
          
          -- Monthly counts
          COALESCE(ss_monthly.hard_solved_monthly,0) AS hard_solved_monthly,
          COALESCE(ss_monthly.medium_solved_monthly,0) AS medium_solved_monthly,
          COALESCE(ss_monthly.easy_solved_monthly,0) AS easy_solved_monthly,
          COALESCE(ss_monthly.total_solved_monthly,0) AS total_solved_monthly,
          
          -- Activity dates for streak calculation
          COALESCE(ad.activity_dates, ARRAY[]::DATE[]) AS activity_dates,
          
          -- Question availability for freeze logic
          COALESCE(
            (SELECT array_agg(qa.date ORDER BY qa.date DESC) 
             FROM question_availability qa 
             WHERE qa.date >= CURRENT_DATE - INTERVAL '365 days'),
            ARRAY[]::DATE[]
          ) AS question_dates,
          
          -- Assigned counts from Batch table
          b.hard_assigned,
          b.medium_assigned,
          b.easy_assigned,
          
          -- Calculate completion percentages for all-time ranking
          ROUND((COALESCE(ss_all.hard_solved,0)::numeric / NULLIF(b.hard_assigned,0) * 100), 2) AS hard_completion,
          ROUND((COALESCE(ss_all.medium_solved,0)::numeric / NULLIF(b.medium_assigned,0) * 100), 2) AS medium_completion,
          ROUND((COALESCE(ss_all.easy_solved,0)::numeric / NULLIF(b.easy_assigned,0) * 100), 2) AS easy_completion,
          
          -- Calculate scores for different time periods
          ROUND(
            (COALESCE(ss_all.hard_solved,0)::numeric / NULLIF(b.hard_assigned,0) * 20) +
            (COALESCE(ss_all.medium_solved,0)::numeric / NULLIF(b.medium_assigned,0) * 15) +
            (COALESCE(ss_all.easy_solved,0)::numeric / NULLIF(b.easy_assigned,0) * 10), 2
          ) AS alltime_score,
          
          ROUND(
            (COALESCE(ss_weekly.hard_solved_weekly,0)::numeric / NULLIF(b.hard_assigned,0) * 20) +
            (COALESCE(ss_weekly.medium_solved_weekly,0)::numeric / NULLIF(b.medium_assigned,0) * 15) +
            (COALESCE(ss_weekly.easy_solved_weekly,0)::numeric / NULLIF(b.easy_assigned,0) * 10), 2
          ) AS weekly_score,
          
          ROUND(
            (COALESCE(ss_monthly.hard_solved_monthly,0)::numeric / NULLIF(b.hard_assigned,0) * 20) +
            (COALESCE(ss_monthly.medium_solved_monthly,0)::numeric / NULLIF(b.medium_assigned,0) * 15) +
            (COALESCE(ss_monthly.easy_solved_monthly,0)::numeric / NULLIF(b.easy_assigned,0) * 10), 2
          ) AS monthly_score
          
        FROM "Student" s
        JOIN "Batch" b ON s.batch_id = b.id
        JOIN "City" c ON s.city_id = c.id
        LEFT JOIN student_solves_all ss_all ON ss_all.student_id = s.id
        LEFT JOIN student_solves_weekly ss_weekly ON ss_weekly.student_id = s.id
        LEFT JOIN student_solves_monthly ss_monthly ON ss_monthly.student_id = s.id
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
          ) AS alltime_global_rank,
          ROW_NUMBER() OVER (
            PARTITION BY batch_year, city_name
            ORDER BY alltime_score DESC, hard_completion DESC, medium_completion DESC, easy_completion DESC, total_solved DESC
          ) AS alltime_city_rank,
          
          -- Weekly rankings
          ROW_NUMBER() OVER (
            PARTITION BY batch_year
            ORDER BY weekly_score DESC, hard_completion DESC, medium_completion DESC, easy_completion DESC, total_solved_weekly DESC
          ) AS weekly_global_rank,
          ROW_NUMBER() OVER (
            PARTITION BY batch_year, city_name
            ORDER BY weekly_score DESC, hard_completion DESC, medium_completion DESC, easy_completion DESC, total_solved_weekly DESC
          ) AS weekly_city_rank,
          
          -- Monthly rankings
          ROW_NUMBER() OVER (
            PARTITION BY batch_year
            ORDER BY monthly_score DESC, hard_completion DESC, medium_completion DESC, easy_completion DESC, total_solved_monthly DESC
          ) AS monthly_global_rank,
          ROW_NUMBER() OVER (
            PARTITION BY batch_year, city_name
            ORDER BY monthly_score DESC, hard_completion DESC, medium_completion DESC, easy_completion DESC, total_solved_monthly DESC
          ) AS monthly_city_rank
          
        FROM final_stats
      )
      
      SELECT 
        student_id,
        hard_solved,
        medium_solved,
        easy_solved,
        activity_dates,
        question_dates,
        weekly_global_rank,
        weekly_city_rank,
        monthly_global_rank,
        monthly_city_rank,
        alltime_global_rank,
        alltime_city_rank
      FROM ranked_stats
      `);

      console.log(`📊 Calculated data for ${result.length} students in ${Date.now() - calculationStart}ms`);

      // Step 3: Bulk upsert new data with streak calculation
      if (result.length > 0) {
        const insertStart = Date.now();
        const values = result.map((row: any) => {
          // Prepare question availability data
          const questionDates = row.question_dates || [];
          const questionAvailability: QuestionAvailability[] = questionDates.map((date: string) => ({
            date,
            hasQuestion: true
          }));
          
          // Calculate streaks with freeze logic
          const activityDates = row.activity_dates || [];
          const streaks = calculateStreakWithFreeze(activityDates, questionAvailability);
          
          return `(${row.student_id}, ${row.hard_solved}, ${row.medium_solved}, ${row.easy_solved}, ${streaks.currentStreak}, ${streaks.maxStreak}, ${row.weekly_global_rank}, ${row.weekly_city_rank}, ${row.monthly_global_rank}, ${row.monthly_city_rank}, ${row.alltime_global_rank}, ${row.alltime_city_rank}, NOW())`;
        }).join(',');

        await tx.$executeRawUnsafe(`
          INSERT INTO "Leaderboard" (
            student_id, hard_solved, medium_solved, easy_solved, 
            current_streak, max_streak,
            weekly_global_rank, weekly_city_rank,
            monthly_global_rank, monthly_city_rank,
            alltime_global_rank, alltime_city_rank,
            last_calculated
          ) VALUES ${values}
          ON CONFLICT (student_id) DO UPDATE SET
            hard_solved = EXCLUDED.hard_solved,
            medium_solved = EXCLUDED.medium_solved,
            easy_solved = EXCLUDED.easy_solved,
            current_streak = EXCLUDED.current_streak,
            max_streak = EXCLUDED.max_streak,
            weekly_global_rank = EXCLUDED.weekly_global_rank,
            weekly_city_rank = EXCLUDED.weekly_city_rank,
            monthly_global_rank = EXCLUDED.monthly_global_rank,
            monthly_city_rank = EXCLUDED.monthly_city_rank,
            alltime_global_rank = EXCLUDED.alltime_global_rank,
            alltime_city_rank = EXCLUDED.alltime_city_rank,
            last_calculated = NOW()
        `);

        console.log(`✅ Upserted ${result.length} student records in ${Date.now() - insertStart}ms`);
      }
    });

    const totalTime = Date.now() - syncStart;
    console.log(`🎉 Leaderboard sync completed successfully in ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    return {
      success: true,
      studentsProcessed: result.length,
      duration: totalTime
    };

  } catch (error) {
    console.error("❌ Leaderboard sync failed:", error);
    throw error;
  }
};
