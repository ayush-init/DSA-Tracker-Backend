"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaderboardByType = exports.getLeaderboardPost = exports.getStudentLeaderboard = exports.getAdminLeaderboard = void 0;
const leaderboard_service_1 = require("../services/leaderboard.service");
const prisma_1 = __importDefault(require("../config/prisma"));
// Admin Leaderboard API with pagination and search
const getAdminLeaderboard = async (req, res) => {
    try {
        // Step 1 — Read filters from request body
        const { city, type, year } = req.body;
        // Step 2 — Read query params for pagination and search
        const { page = 1, limit = 10, search } = req.query;
        // Step 3 — Prepare filters
        const filters = {
            type: type || 'all',
            city: city || 'all',
            year: year || new Date().getFullYear()
        };
        // Step 4 - Prepare pagination
        const pagination = {
            page: Number(page),
            limit: Number(limit)
        };
        // Step 5 — Use optimized service
        const result = await (0, leaderboard_service_1.getLeaderboardWithPagination)(filters, pagination, search);
        return res.status(200).json({
            success: true,
            page: result.pagination.page,
            limit: result.pagination.limit,
            total: result.pagination.total,
            totalPages: result.pagination.totalPages,
            leaderboard: result.leaderboard
        });
    }
    catch (error) {
        console.error("Admin leaderboard error:", error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "An error occurred"
        });
    }
};
exports.getAdminLeaderboard = getAdminLeaderboard;
// Student Leaderboard API with top 10 and personal rank
const getStudentLeaderboard = async (req, res) => {
    try {
        // Step 1 — Get student ID from auth middleware
        const studentId = req.studentId;
        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "Student ID not found in request."
            });
        }
        // Step 2 — Read filters from request body
        const { city, type, year } = req.body;
        // Step 3 — Read query params (optional username search)
        const { username } = req.query;
        // Step 4 — Get student's batch year for validation
        const student = await prisma_1.default.student.findUnique({
            where: { id: studentId },
            include: {
                batch: {
                    select: {
                        year: true
                    }
                }
            }
        });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }
        // Step 5 — Prepare filters
        const filters = {
            type: type || 'all',
            city: city || 'all',
            year: year || student.batch?.year || new Date().getFullYear()
        };
        // Step 6 — Fetch Top 10 using shared service with limit 10
        const pagination = { page: 1, limit: 10 };
        let search = username;
        const top10Result = await (0, leaderboard_service_1.getLeaderboardWithPagination)(filters, pagination, search);
        // Step 7 — Get logged-in student's rank
        const studentPagination = { page: 1, limit: 1000 }; // Get more results to find student
        const allStudentsResult = await (0, leaderboard_service_1.getLeaderboardWithPagination)(filters, studentPagination, null);
        const studentEntry = allStudentsResult.leaderboard.find((entry) => entry.student_id === studentId);
        // Step 8 — Prepare yourRank response
        let yourRank = null;
        let rankMessage = null;
        if (studentEntry) {
            yourRank = {
                global_rank: studentEntry.global_rank,
                city_rank: studentEntry.city_rank,
                student_details: {
                    student_id: studentId,
                    name: student.name,
                    username: student.username,
                    email: student.email,
                    city: studentEntry.city_name,
                    year: studentEntry.batch_year,
                    leetcode_id: student.leetcode_id || '',
                    gfg_id: student.gfg_id || '',
                    lc_total_solved: student.lc_total_solved || 0,
                    gfg_total_solved: student.gfg_total_solved || 0,
                    last_synced_at: student.last_synced_at
                },
                rank_statistics: {
                    global_rank: studentEntry.global_rank,
                    city_rank: studentEntry.city_rank,
                    score: studentEntry.score,
                    max_streak: studentEntry.max_streak,
                    total_solved: studentEntry.total_solved,
                    hard_completion: studentEntry.hard_completion,
                    medium_completion: studentEntry.medium_completion,
                    easy_completion: studentEntry.easy_completion
                },
                problem_solving_stats: {
                    total_questions_solved: studentEntry.hard_solved + studentEntry.medium_solved + studentEntry.easy_solved,
                    easy_solved: studentEntry.easy_solved,
                    medium_solved: studentEntry.medium_solved,
                    hard_solved: studentEntry.hard_solved
                }
            };
        }
        else {
            // Check if year mismatch
            if (year && year !== student.batch?.year) {
                rankMessage = `Student belongs to ${student.batch?.year} batch, but ${year} data requested`;
            }
            else {
                rankMessage = "Student rank not found in current filters";
            }
        }
        return res.status(200).json({
            success: true,
            top10: top10Result.leaderboard,
            yourRank,
            message: rankMessage,
            filters: {
                city: filters.city,
                year: filters.year,
                type: filters.type
            }
        });
    }
    catch (error) {
        console.error("Student leaderboard error:", error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "An error occurred"
        });
    }
};
exports.getStudentLeaderboard = getStudentLeaderboard;
// Legacy endpoints for backward compatibility
const getLeaderboardPost = async (req, res) => {
    try {
        const { city, year, type } = req.body;
        const query = {
            type: type || 'all',
            city: city || 'all',
            year: year || new Date().getFullYear()
        };
        // For backward compatibility, get first page without pagination
        const pagination = { page: 1, limit: 100 };
        const result = await (0, leaderboard_service_1.getLeaderboardWithPagination)(query, pagination, null);
        return res.status(200).json({
            success: true,
            data: result.leaderboard
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "An error occurred"
        });
    }
};
exports.getLeaderboardPost = getLeaderboardPost;
const getLeaderboardByType = async (req, res) => {
    try {
        const studentId = req.studentId;
        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "Student ID not found in request."
            });
        }
        const { type, city, year } = req.body;
        const query = {
            type: type || 'all',
            city: city || 'all',
            year: year || new Date().getFullYear()
        };
        // Get leaderboard data
        const pagination = { page: 1, limit: 100 };
        const leaderboardResult = await (0, leaderboard_service_1.getLeaderboardWithPagination)(query, pagination, null);
        const leaderboard = leaderboardResult.leaderboard;
        // Find the student's rank in the leaderboard
        const studentEntry = leaderboard.find((entry) => entry.student_id === studentId);
        // Get detailed student progress information
        const studentProgress = await prisma_1.default.studentProgress.findMany({
            where: { student_id: studentId },
            include: {
                question: {
                    select: {
                        question_name: true,
                        level: true,
                        platform: true,
                        question_link: true,
                        topic: {
                            select: {
                                topic_name: true,
                                slug: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                sync_at: "desc"
            }
        });
        // Calculate statistics
        const totalSolved = studentProgress.length;
        const easySolved = studentProgress.filter((p) => p.question.level === 'EASY').length;
        const mediumSolved = studentProgress.filter((p) => p.question.level === 'MEDIUM').length;
        const hardSolved = studentProgress.filter((p) => p.question.level === 'HARD').length;
        // Get student's basic info
        const student = await prisma_1.default.student.findUnique({
            where: { id: studentId },
            include: {
                city: {
                    select: {
                        city_name: true
                    }
                },
                batch: {
                    select: {
                        batch_name: true,
                        year: true
                    }
                }
            }
        });
        const studentRank = studentEntry ? {
            global_rank: studentEntry.global_rank,
            city_rank: studentEntry.city_rank,
            student_details: {
                student_id: studentId,
                name: student?.name || '',
                username: student?.username || '',
                email: student?.email || '',
                city: student?.city?.city_name || '',
                batch: student?.batch?.batch_name || '',
                year: student?.batch?.year || 0,
                leetcode_id: student?.leetcode_id || '',
                gfg_id: student?.gfg_id || '',
                lc_total_solved: student?.lc_total_solved || 0,
                gfg_total_solved: student?.gfg_total_solved || 0,
                last_synced_at: student?.last_synced_at
            },
            rank_statistics: {
                global_rank: studentEntry.global_rank,
                city_rank: studentEntry.city_rank,
                score: studentEntry.score,
                max_streak: studentEntry.max_streak,
                total_solved: studentEntry.total_solved,
                hard_completion: studentEntry.hard_completion,
                medium_completion: studentEntry.medium_completion,
                easy_completion: studentEntry.easy_completion
            },
            problem_solving_stats: {
                total_questions_solved: totalSolved,
                easy_solved: easySolved,
                medium_solved: mediumSolved,
                hard_solved: hardSolved,
                recent_solutions: studentProgress.slice(0, 10).map((p) => ({
                    question_name: p.question.question_name,
                    level: p.question.level,
                    platform: p.question.platform,
                    topic: p.question.topic?.topic_name || '',
                    solved_at: p.sync_at
                }))
            }
        } : null;
        return res.status(200).json({
            success: true,
            data: leaderboard,
            yourRank: studentRank
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "An error occurred"
        });
    }
};
exports.getLeaderboardByType = getLeaderboardByType;
