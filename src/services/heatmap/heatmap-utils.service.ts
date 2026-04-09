import prisma from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

export interface BatchQuestionStats {
  totalAssigned: number;
  totalSolved: number;
  completedAllQuestions: boolean;
}

/**
 * Get the first question assignment month for a batch
 * This determines the heatmap start date
 */
export async function getBatchStartMonth(batchId: number): Promise<Date> {
  // Get batch data for year-based fallback
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { year: true }
  });

  if (!batch) {
    throw new ApiError(404, "Batch not found");
  }

  const result = await prisma.$queryRaw`
    SELECT DATE_TRUNC('month', MIN(qv.assigned_at)) as start_month
    FROM "QuestionVisibility" qv
    JOIN "Class" c ON qv.class_id = c.id
    WHERE c.batch_id = ${batchId}
    AND qv.assigned_at IS NOT NULL
  ` as any[];

  if (!result.length || !result[0].start_month) {
    // Return today's date if no questions assigned yet
    return new Date();
  }

  return new Date(result[0].start_month);
}

/**
 * Get batch question statistics for freeze day logic
 */
export async function getBatchQuestionStats(batchId: number, studentId: number): Promise<BatchQuestionStats> {
  const result = await prisma.$queryRaw`
    SELECT 
      (b.hard_assigned + b.medium_assigned + b.easy_assigned) as total_assigned,
      COALESCE(student_solved.total_solved, 0) as total_solved
    FROM "Batch" b
    LEFT JOIN (
      SELECT COUNT(DISTINCT sp.question_id) as total_solved
      FROM "StudentProgress" sp
      WHERE sp.student_id = ${studentId}
    ) student_solved ON true
    WHERE b.id = ${batchId}
  ` as any[];

  if (!result.length) {
    return {
      totalAssigned: 0,
      totalSolved: 0,
      completedAllQuestions: false
    };
  }

  const { total_assigned, total_solved } = result[0];
  return {
    totalAssigned: Number(total_assigned) || 0,
    totalSolved: Number(total_solved) || 0,
    completedAllQuestions: Number(total_solved) >= Number(total_assigned)
  };
}

/**
 * Check if questions were assigned on a specific date for a batch
 */
export async function hasQuestionAssignment(batchId: number, date: string): Promise<boolean> {
  const result = await prisma.$queryRaw`
    SELECT EXISTS(
      SELECT 1 
      FROM "QuestionVisibility" qv
      JOIN "Class" c ON qv.class_id = c.id
      WHERE DATE(qv.assigned_at) = ${date}
      AND c.batch_id = ${batchId}
    ) as has_question
  ` as any[];

  return result.length > 0 && Boolean(result[0].has_question);
}

/**
 * Calculate heatmap count based on unified freeze day logic
 */
export function calculateHeatmapCount(
  submissions: number,
  hasQuestion: boolean,
  batchStats: BatchQuestionStats
): number {
  if (submissions > 0) {
    return submissions;
  }

  if (!hasQuestion) {
    // No questions assigned today - check if student completed all questions
    if (batchStats.completedAllQuestions) {
      return -1; // Freeze day - student completed all questions
    } else {
      return 0;  // Break day - student had pending questions
    }
  }

  // Questions available but no submissions
  return 0;
}

