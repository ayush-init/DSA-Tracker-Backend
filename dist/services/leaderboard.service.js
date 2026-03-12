"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaderboardWithPagination = exports.getLeaderboardService = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getLeaderboardService = async (query) => {
    const { type = "all", city = "all", year = null } = query;
    // Validate type parameter
    const validTypes = ["all", "weekly", "monthly"];
    if (!validTypes.includes(type)) {
        throw new Error(`Invalid type parameter. Must be one of: ${validTypes.join(", ")}`);
    }
    try {
        // Dynamic rank selection based on time period
        let globalRankField = "l.alltime_global_rank";
        let cityRankField = "l.alltime_city_rank";
        if (type === "weekly") {
            globalRankField = "l.weekly_global_rank";
            cityRankField = "l.weekly_city_rank";
        }
        else if (type === "monthly") {
            globalRankField = "l.monthly_global_rank";
            cityRankField = "l.monthly_city_rank";
        }
        // Build filters
        let whereClause = "WHERE 1=1";
        if (city && city !== "all") {
            whereClause += ` AND c.city_name = '${city}'`;
        }
        if (year && year !== "all") {
            whereClause += ` AND b.year = ${year}`;
        }
        const leaderboardQuery = `
            SELECT
                s.id AS student_id,
                s.name,
                s.username,
                c.city_name,
                b.year AS batch_year,
                l.hard_solved,
                l.medium_solved,
                l.easy_solved,
                l.hard_solved + l.medium_solved + l.easy_solved AS total_solved,
                l.current_streak,
                l.max_streak,
                -- Dynamic score calculation
                ROUND(
                    (l.hard_solved::numeric / NULLIF(b.hard_assigned,0) * 20) +
                    (l.medium_solved::numeric / NULLIF(b.medium_assigned,0) * 15) +
                    (l.easy_solved::numeric / NULLIF(b.easy_assigned,0) * 10), 2
                ) AS score,
                -- Completion percentages
                ROUND((l.hard_solved::numeric / NULLIF(b.hard_assigned,0) * 100), 2) AS hard_completion,
                ROUND((l.medium_solved::numeric / NULLIF(b.medium_assigned,0) * 100), 2) AS medium_completion,
                ROUND((l.easy_solved::numeric / NULLIF(b.easy_assigned,0) * 100), 2) AS easy_completion,
                -- Time-based rankings from database
                ${globalRankField} AS global_rank,
                ${cityRankField} AS city_rank,
                l.last_calculated
            FROM "Student" s
            JOIN "Batch" b ON b.id = s.batch_id
            JOIN "City" c ON c.id = s.city_id
            JOIN "Leaderboard" l ON l.student_id = s.id
            ${whereClause}
            ORDER BY ${globalRankField}
            LIMIT 100
        `;
        const leaderboardData = await prisma_1.default.$queryRawUnsafe(leaderboardQuery);
        // Normalize results
        const normalized = leaderboardData.map((row) => ({
            student_id: row.student_id,
            name: row.name,
            username: row.username,
            city_name: row.city_name,
            batch_year: row.batch_year,
            hard_solved: Number(row.hard_solved),
            medium_solved: Number(row.medium_solved),
            easy_solved: Number(row.easy_solved),
            total_solved: Number(row.total_solved),
            current_streak: Number(row.current_streak),
            max_streak: Number(row.max_streak),
            hard_completion: Number(row.hard_completion) || 0,
            medium_completion: Number(row.medium_completion) || 0,
            easy_completion: Number(row.easy_completion) || 0,
            score: Number(row.score) || 0,
            global_rank: Number(row.global_rank),
            city_rank: Number(row.city_rank),
            last_calculated: row.last_calculated
        }));
        return normalized;
    }
    catch (error) {
        console.error("Leaderboard service error:", error);
        throw error;
    }
};
exports.getLeaderboardService = getLeaderboardService;
const getLeaderboardWithPagination = async (filters, pagination, search) => {
    try {
        const { type = "all", city = "all", year = null } = filters;
        const { page = 1, limit = 20 } = pagination;
        // Validate type parameter
        const validTypes = ["all", "weekly", "monthly"];
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid type parameter. Must be one of: ${validTypes.join(", ")}`);
        }
        // Dynamic rank selection based on time period
        let globalRankField = "l.alltime_global_rank";
        let cityRankField = "l.alltime_city_rank";
        if (type === "weekly") {
            globalRankField = "l.weekly_global_rank";
            cityRankField = "l.weekly_city_rank";
        }
        else if (type === "monthly") {
            globalRankField = "l.monthly_global_rank";
            cityRankField = "l.monthly_city_rank";
        }
        // Build filters
        let whereClause = "WHERE 1=1";
        if (city && city !== "all") {
            whereClause += ` AND c.city_name = '${city}'`;
        }
        if (year && year !== "all") {
            whereClause += ` AND b.year = ${year}`;
        }
        if (search) {
            whereClause += ` AND (s.name ILIKE '%${search}%' OR s.username ILIKE '%${search}%')`;
        }
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM "Student" s
            JOIN "Batch" b ON b.id = s.batch_id
            JOIN "City" c ON c.id = s.city_id
            JOIN "Leaderboard" l ON l.student_id = s.id
            ${whereClause}
        `;
        const totalCount = await prisma_1.default.$queryRawUnsafe(countQuery);
        const total = Number(totalCount[0]?.total || 0);
        // Get leaderboard data
        const leaderboardQuery = `
            SELECT
                s.id AS student_id,
                s.name,
                s.username,
                c.city_name,
                b.year AS batch_year,
                l.hard_solved,
                l.medium_solved,
                l.easy_solved,
                l.hard_solved + l.medium_solved + l.easy_solved AS total_solved,
                l.current_streak,
                l.max_streak,
                -- Dynamic score calculation
                ROUND(
                    (l.hard_solved::numeric / NULLIF(b.hard_assigned,0) * 20) +
                    (l.medium_solved::numeric / NULLIF(b.medium_assigned,0) * 15) +
                    (l.easy_solved::numeric / NULLIF(b.easy_assigned,0) * 10), 2
                ) AS score,
                -- Completion percentages
                ROUND((l.hard_solved::numeric / NULLIF(b.hard_assigned,0) * 100), 2) AS hard_completion,
                ROUND((l.medium_solved::numeric / NULLIF(b.medium_assigned,0) * 100), 2) AS medium_completion,
                ROUND((l.easy_solved::numeric / NULLIF(b.easy_assigned,0) * 100), 2) AS easy_completion,
                -- Time-based rankings
                ${globalRankField} AS global_rank,
                ${cityRankField} AS city_rank,
                l.last_calculated
            FROM "Student" s
            JOIN "Batch" b ON b.id = s.batch_id
            JOIN "City" c ON c.id = s.city_id
            JOIN "Leaderboard" l ON l.student_id = s.id
            ${whereClause}
            ORDER BY ${globalRankField}
            LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `;
        const leaderboardData = await prisma_1.default.$queryRawUnsafe(leaderboardQuery);
        // Normalize results
        const normalized = leaderboardData.map((row) => ({
            student_id: row.student_id,
            name: row.name,
            username: row.username,
            city_name: row.city_name,
            batch_year: row.batch_year,
            hard_solved: Number(row.hard_solved),
            medium_solved: Number(row.medium_solved),
            easy_solved: Number(row.easy_solved),
            total_solved: Number(row.total_solved),
            current_streak: Number(row.current_streak),
            max_streak: Number(row.max_streak),
            hard_completion: Number(row.hard_completion) || 0,
            medium_completion: Number(row.medium_completion) || 0,
            easy_completion: Number(row.easy_completion) || 0,
            score: Number(row.score) || 0,
            global_rank: Number(row.global_rank),
            city_rank: Number(row.city_rank),
            last_calculated: row.last_calculated
        }));
        return {
            leaderboard: normalized,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    catch (error) {
        console.error("Leaderboard service error:", error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};
exports.getLeaderboardWithPagination = getLeaderboardWithPagination;
