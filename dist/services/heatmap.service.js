"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBatchStartMonth = getBatchStartMonth;
exports.getBatchQuestionStats = getBatchQuestionStats;
exports.hasQuestionAssignment = hasQuestionAssignment;
exports.calculateHeatmapCount = calculateHeatmapCount;
exports.generateUnifiedHeatmap = generateUnifiedHeatmap;
exports.getTodayQuestionAvailability = getTodayQuestionAvailability;
const prisma_1 = __importDefault(require("../config/prisma"));
const ApiError_1 = require("../utils/ApiError");
/**
 * Get the first question assignment month for a batch
 * This determines the heatmap start date
 */
async function getBatchStartMonth(batchId) {
    // Get batch data for year-based fallback
    const batch = await prisma_1.default.batch.findUnique({
        where: { id: batchId },
        select: { year: true }
    });
    if (!batch) {
        throw new ApiError_1.ApiError(404, "Batch not found");
    }
    const result = await prisma_1.default.$queryRaw `
    SELECT DATE_TRUNC('month', MIN(qv.assigned_at)) as start_month
    FROM "QuestionVisibility" qv
    JOIN "Class" c ON qv.class_id = c.id
    WHERE c.batch_id = ${batchId}
    AND qv.assigned_at IS NOT NULL
  `;
    if (!result.length || !result[0].start_month) {
        // Return today's date if no questions assigned yet
        return new Date();
    }
    return new Date(result[0].start_month);
}
/**
 * Get batch question statistics for freeze day logic
 */
async function getBatchQuestionStats(batchId, studentId) {
    const result = await prisma_1.default.$queryRaw `
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
  `;
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
async function hasQuestionAssignment(batchId, date) {
    const result = await prisma_1.default.$queryRaw `
    SELECT EXISTS(
      SELECT 1 
      FROM "QuestionVisibility" qv
      JOIN "Class" c ON qv.class_id = c.id
      WHERE DATE(qv.assigned_at) = ${date}
      AND c.batch_id = ${batchId}
    ) as has_question
  `;
    return result.length > 0 && Boolean(result[0].has_question);
}
/**
 * Calculate heatmap count based on unified freeze day logic
 */
function calculateHeatmapCount(submissions, hasQuestion, batchStats) {
    if (submissions > 0) {
        return submissions;
    }
    if (!hasQuestion) {
        // No questions assigned today - check if student completed all questions
        if (batchStats.completedAllQuestions) {
            return -1; // Freeze day - student completed all questions
        }
        else {
            return 0; // Break day - student had pending questions
        }
    }
    // Questions available but no submissions
    return 0;
}
/**
 * Generate unified heatmap data for both private and public profiles
 */
async function generateUnifiedHeatmap(studentId, batchId, options = {}) {
    try {
        // Check if any questions are assigned to this batch
        const hasQuestions = await prisma_1.default.$queryRaw `
      SELECT EXISTS(
        SELECT 1 
        FROM "QuestionVisibility" qv
        JOIN "Class" c ON qv.class_id = c.id
        WHERE c.batch_id = ${batchId}
        AND qv.assigned_at IS NOT NULL
      ) as has_questions
    `;
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
        const heatmap = await prisma_1.default.$queryRaw `
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
    `;
        return heatmap.map((h) => ({
            date: h.date,
            count: Number(h.count)
        }));
    }
    catch (error) {
        throw new ApiError_1.ApiError(400, "Heatmap generation failed: " +
            (error instanceof Error ? error.message : String(error)));
    }
}
/**
 * Get today's question availability for streak calculation
 */
async function getTodayQuestionAvailability(batchId) {
    const todayStr = new Date().toISOString().split('T')[0];
    const result = await prisma_1.default.$queryRaw `
    SELECT EXISTS(
      SELECT 1 
      FROM "QuestionVisibility" qv
      JOIN "Class" c ON qv.class_id = c.id
      WHERE DATE(qv.assigned_at) = ${todayStr}
      AND c.batch_id = ${batchId}
    ) as has_question
  `;
    return result.length > 0 && Boolean(result[0].has_question);
}
