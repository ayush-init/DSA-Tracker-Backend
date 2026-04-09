import prisma from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { getBatchStartMonth, getBatchQuestionStats } from "./heatmap-utils.service";

export interface HeatmapOptions {
  includePrivateData?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface HeatmapData {
  date: string;
  count: number;
}

/**
 * Generate unified heatmap data for both private and public profiles
 */
export async function generateUnifiedHeatmap(
  studentId: number,
  batchId: number,
  options: HeatmapOptions = {}
): Promise<HeatmapData[]> {
  try {
    // Check if any questions are assigned to this batch
    const hasQuestions = await prisma.$queryRaw`
      SELECT EXISTS(
        SELECT 1 
        FROM "QuestionVisibility" qv
        JOIN "Class" c ON qv.class_id = c.id
        WHERE c.batch_id = ${batchId}
        AND qv.assigned_at IS NOT NULL
      ) as has_questions
    ` as any[];

    if (!hasQuestions.length || !hasQuestions[0].has_questions) {
      return []; // Return empty heatmap if no questions assigned
    }

    // Get batch start month (dynamic start date)
    const startDate = options.startDate || await getBatchStartMonth(batchId);
    
    // Ensure endDate includes today in local timezone by adding 1 day buffer
    const serverEndDate = options.endDate || new Date();
    const endDate = new Date(serverEndDate);
    endDate.setDate(endDate.getDate() + 1); // Add 1 day to include today's submissions in any timezone

    // Get batch question stats for freeze day logic
    const batchStats = await getBatchQuestionStats(batchId, studentId);

    // Generate heatmap data
    const heatmap = await prisma.$queryRaw`
      WITH date_range AS (
        SELECT generate_series(
          DATE(${startDate.toISOString().split('T')[0]})::date,
          DATE(${endDate.toISOString().split('T')[0]})::date,
          '1 day'::interval
        )::date as date
      ),
      student_submissions AS (
        SELECT 
          DATE(sync_at) as submission_date,
          COUNT(*) as submission_count
        FROM "StudentProgress"
        WHERE student_id = ${studentId}
          AND DATE(sync_at) >= DATE(${startDate.toISOString().split('T')[0]})
        GROUP BY DATE(sync_at)
      ),
      question_availability AS (
        SELECT 
          dr.date,
          COALESCE(ss.submission_count, 0) as submissions,
          CASE 
            WHEN EXISTS (
              SELECT 1 
              FROM "QuestionVisibility" qv
              JOIN "Class" c ON qv.class_id = c.id
              WHERE DATE(qv.assigned_at) = dr.date
                AND c.batch_id = ${batchId}
            ) THEN true
            ELSE false
          END as has_question
        FROM date_range dr
        LEFT JOIN student_submissions ss ON dr.date = ss.submission_date
      )
      SELECT 
        date,
        CASE 
          WHEN submissions > 0 THEN submissions
          WHEN NOT has_question THEN 
            CASE 
              WHEN ${batchStats.completedAllQuestions} THEN -1  -- Freeze day
              ELSE 0                                           -- Break day
            END
          ELSE 0  -- Questions available but no submissions
        END as count
      FROM question_availability
      ORDER BY date DESC
    ` as any[];

    return heatmap.map((h) => ({
      date: h.date,
      count: Number(h.count)
    }));

  } catch (error) {
    throw new ApiError(400, 
      "Heatmap generation failed: " + 
      (error instanceof Error ? error.message : String(error))
    );
  }
}
