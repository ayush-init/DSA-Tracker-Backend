"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentProfileService = exports.getRecentActivity = exports.getTopicProgress = exports.getHeatmapData = exports.getLeaderboardStats = exports.getStreakInfo = exports.getCodingStats = exports.getStudentBasicInfo = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getStudentBasicInfo = async (studentId) => {
    try {
        const student = await prisma_1.default.student.findUnique({
            where: { id: studentId },
            select: {
                name: true,
                username: true,
                email: true,
                enrollment_id: true,
                city: {
                    select: { city_name: true }
                },
                batch: {
                    select: { batch_name: true }
                },
                github: true,
                linkedin: true,
                leetcode_id: true,
                gfg_id: true
            }
        });
        if (!student) {
            throw new Error("Student not found");
        }
        return {
            name: student.name,
            username: student.username,
            email: student.email,
            enrollmentId: student.enrollment_id,
            city: student.city?.city_name || null,
            batch: student.batch?.batch_name || null,
            github: student.github,
            linkedin: student.linkedin,
            leetcode: student.leetcode_id,
            gfg: student.gfg_id
        };
    }
    catch (error) {
        throw new Error("Student basic info retrieval failed: " + (error instanceof Error ? error.message : String(error)));
    }
};
exports.getStudentBasicInfo = getStudentBasicInfo;
const getCodingStats = async (studentId) => {
    try {
        // First get student's batch info
        const student = await prisma_1.default.student.findUnique({
            where: { id: studentId },
            select: { batch_id: true }
        });
        if (!student || !student.batch_id) {
            throw new Error("Student batch not found");
        }
        const [stats, totalQuestions] = await Promise.all([
            prisma_1.default.$queryRawUnsafe(`
        SELECT
          COUNT(*) as total_solved,
          COUNT(*) FILTER (WHERE q.level = 'EASY') as easy_solved,
          COUNT(*) FILTER (WHERE q.level = 'MEDIUM') as medium_solved,
          COUNT(*) FILTER (WHERE q.level = 'HARD') as hard_solved,
          COUNT(*) as total_submissions,
          CASE 
            WHEN COUNT(*) > 0 THEN ROUND((COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM "Question"), 0)) * 100, 2)
            ELSE 0
          END as acceptance_rate
        FROM "StudentProgress" sp
        JOIN "Question" q ON q.id = sp.question_id
        WHERE sp.student_id = ${studentId}
      `),
            prisma_1.default.$queryRawUnsafe(`
        SELECT
          COUNT(*) FILTER (WHERE q.level = 'EASY') as easy_total,
          COUNT(*) FILTER (WHERE q.level = 'MEDIUM') as medium_total,
          COUNT(*) FILTER (WHERE q.level = 'HARD') as hard_total
        FROM "Question" q
        JOIN "QuestionVisibility" qv ON qv.question_id = q.id
        JOIN "Class" c ON c.id = qv.class_id
        WHERE c.batch_id = ${student.batch_id}
      `)
        ]);
        const statsResult = stats;
        const totalResult = totalQuestions;
        if (!statsResult || statsResult.length === 0 || !totalResult || totalResult.length === 0) {
            return {
                totalSolved: 0,
                easy: { solved: 0, total: 0 },
                medium: { solved: 0, total: 0 },
                hard: { solved: 0, total: 0 },
                totalSubmissions: 0,
                acceptanceRate: 0
            };
        }
        const statsRow = statsResult[0];
        const totalRow = totalResult[0];
        return {
            totalSolved: Number(statsRow.total_solved) || 0,
            easy: {
                solved: Number(statsRow.easy_solved) || 0,
                total: Number(totalRow.easy_total) || 0
            },
            medium: {
                solved: Number(statsRow.medium_solved) || 0,
                total: Number(totalRow.medium_total) || 0
            },
            hard: {
                solved: Number(statsRow.hard_solved) || 0,
                total: Number(totalRow.hard_total) || 0
            },
            totalSubmissions: Number(statsRow.total_submissions) || 0,
            acceptanceRate: Number(statsRow.acceptance_rate) || 0
        };
    }
    catch (error) {
        throw new Error("Coding stats calculation failed: " + (error instanceof Error ? error.message : String(error)));
    }
};
exports.getCodingStats = getCodingStats;
const getStreakInfo = async (studentId) => {
    try {
        // Get streak data directly from leaderboard table (pre-calculated)
        const leaderboardData = await prisma_1.default.leaderboard.findUnique({
            where: { student_id: studentId },
            select: {
                current_streak: true,
                max_streak: true,
                last_calculated: true
            }
        });
        if (!leaderboardData) {
            return {
                currentStreak: 0,
                maxStreak: 0,
            };
        }
        return {
            currentStreak: leaderboardData.current_streak || 0,
            maxStreak: leaderboardData.max_streak || 0,
        };
    }
    catch (error) {
        throw new Error("Error occurred in STREAK module: " +
            (error instanceof Error ? error.message : String(error)));
    }
};
exports.getStreakInfo = getStreakInfo;
const getLeaderboardStats = async (studentId) => {
    try {
        const student = await prisma_1.default.student.findUnique({
            where: { id: studentId },
            select: { city_id: true, batch_id: true }
        });
        if (!student) {
            throw new Error("Student not found");
        }
        const rankings = await prisma_1.default.$queryRawUnsafe(`
      WITH student_stats AS (
        SELECT
          s.id as student_id,
          s.city_id,
          s.batch_id,
          COUNT(*) FILTER (WHERE q.level = 'HARD') as hard_solved,
          COUNT(*) FILTER (WHERE q.level = 'MEDIUM') as medium_solved,
          COUNT(*) FILTER (WHERE q.level = 'EASY') as easy_solved,
          COUNT(*) as total_solved,
          (COUNT(*) FILTER (WHERE q.level = 'HARD') * 20 + 
           COUNT(*) FILTER (WHERE q.level = 'MEDIUM') * 15 + 
           COUNT(*) FILTER (WHERE q.level = 'EASY') * 10) as total_score
        FROM "Student" s
        JOIN "StudentProgress" sp ON sp.student_id = s.id
        JOIN "Question" q ON q.id = sp.question_id
        GROUP BY s.id, s.city_id, s.batch_id
      ),
      all_rankings AS (
        SELECT
          student_id,
          city_id,
          batch_id,
          total_score,
          ROW_NUMBER() OVER (ORDER BY total_score DESC) as global_rank,
          ROW_NUMBER() OVER (PARTITION BY city_id ORDER BY total_score DESC) as city_rank,
          ROW_NUMBER() OVER (PARTITION BY batch_id ORDER BY total_score DESC) as batch_rank
        FROM student_stats
      )
      SELECT * FROM all_rankings WHERE student_id = ${studentId}
    `);
        const result = rankings;
        if (!result || result.length === 0) {
            return {
                globalRank: 0,
                cityRank: 0,
                totalScore: 0
            };
        }
        const row = result[0];
        const totalScore = Number(row.total_score) || 0;
        // const xpPoints = totalScore * 10;
        // const level = Math.floor(xpPoints / 1000) + 1;
        return {
            globalRank: Number(row.global_rank) || 0,
            cityRank: Number(row.city_rank) || 0,
            // batchRank: Number(row.batch_rank) || 0,
            totalScore,
            // xpPoints,
            // level
        };
    }
    catch (error) {
        throw new Error("Leaderboard stats calculation failed: " + (error instanceof Error ? error.message : String(error)));
    }
};
exports.getLeaderboardStats = getLeaderboardStats;
const getHeatmapData = async (studentId) => {
    try {
        const heatmap = await prisma_1.default.$queryRaw `
      SELECT
        DATE(sp.sync_at) as date,
        COUNT(*) as count
      FROM "StudentProgress" sp
      WHERE sp.student_id = ${studentId}
      GROUP BY DATE(sp.sync_at)
      ORDER BY date DESC
    `;
        const result = heatmap;
        return result.map(row => ({
            date: row.date.toISOString().split("T")[0], // 👈 FIX
            count: Number(row.count)
        }));
    }
    catch (error) {
        throw new Error("Error occurred in HEATMAP module: " +
            (error instanceof Error ? error.message : String(error)));
    }
};
exports.getHeatmapData = getHeatmapData;
const getTopicProgress = async (studentId) => {
    try {
        const topics = await prisma_1.default.$queryRawUnsafe(`
      WITH topic_stats AS (
        SELECT
          t.id as topic_id,
          t.topic_name,
          COUNT(q.id) as total_questions,
          COUNT(sp.question_id) FILTER (WHERE sp.student_id = ${studentId}) as solved_questions
        FROM "Topic" t
        LEFT JOIN "Question" q ON q.topic_id = t.id
        LEFT JOIN "StudentProgress" sp ON sp.question_id = q.id
        GROUP BY t.id, t.topic_name
        HAVING COUNT(q.id) > 0
      )
      SELECT
        topic_name as topic,
        solved_questions as solved,
        total_questions as total
      FROM topic_stats
      WHERE solved_questions > 0
      ORDER BY solved DESC
      LIMIT 5
    `);
        const result = topics;
        return result.map(row => ({
            topic: row.topic,
            solved: Number(row.solved) || 0,
            total: Number(row.total) || 0
        }));
    }
    catch (error) {
        throw new Error("Topic progress calculation failed: " + (error instanceof Error ? error.message : String(error)));
    }
};
exports.getTopicProgress = getTopicProgress;
const getRecentActivity = async (studentId) => {
    try {
        const activity = await prisma_1.default.$queryRawUnsafe(`
      SELECT
        q.question_name as problem_title,
        q.level as difficulty,
        sp.sync_at as solved_at
      FROM "StudentProgress" sp
      JOIN "Question" q ON q.id = sp.question_id
      WHERE sp.student_id = ${studentId}
      ORDER BY sp.sync_at DESC
      LIMIT 5
    `);
        const result = activity;
        return result.map(row => ({
            problemTitle: row.problem_title,
            difficulty: row.difficulty,
            solvedAt: row.solved_at
        }));
    }
    catch (error) {
        throw new Error("Recent activity retrieval failed: " + (error instanceof Error ? error.message : String(error)));
    }
};
exports.getRecentActivity = getRecentActivity;
const getStudentProfileService = async (studentId) => {
    try {
        const [student, codingStats, streak, leaderboard, heatmap, topicProgress, recentActivity] = await Promise.all([
            (0, exports.getStudentBasicInfo)(studentId),
            (0, exports.getCodingStats)(studentId),
            (0, exports.getStreakInfo)(studentId),
            (0, exports.getLeaderboardStats)(studentId),
            (0, exports.getHeatmapData)(studentId),
            (0, exports.getTopicProgress)(studentId),
            (0, exports.getRecentActivity)(studentId)
        ]);
        return {
            student,
            codingStats,
            streak,
            leaderboard,
            heatmap,
            topicProgress,
            recentActivity
        };
    }
    catch (error) {
        throw new Error("Student profile retrieval failed: " + (error instanceof Error ? error.message : String(error)));
    }
};
exports.getStudentProfileService = getStudentProfileService;
