"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicStudentProfileService = exports.getStudentProfileService = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const ApiError_1 = require("../utils/ApiError");
const heatmap_service_1 = require("./heatmap.service");
const getStudentProfileService = async (studentId) => {
    try {
        // 1️⃣ Get student basic info + leaderboard
        const student = await prisma_1.default.student.findUnique({
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
                city: true,
                batch: true,
                leaderboards: true,
                _count: {
                    select: {
                        progress: true
                    }
                }
            }
        });
        if (!student) {
            throw new ApiError_1.ApiError(400, "Student not found");
        }
        // Get batch question counts for all levels
        const batchQuestionCounts = await prisma_1.default.batch.findUnique({
            where: { id: student.batch_id },
            select: {
                easy_assigned: true,
                medium_assigned: true,
                hard_assigned: true
            }
        });
        const leaderboard = student.leaderboards;
        // 2️⃣ Get recent activity
        const recentActivity = await prisma_1.default.studentProgress.findMany({
            where: { student_id: studentId },
            include: {
                question: {
                    select: {
                        question_name: true,
                        level: true,
                        question_link: true
                    }
                }
            },
            orderBy: {
                sync_at: "desc"
            },
            take: 5
        });
        // 3️⃣ Unified Heatmap with Dynamic Start Date
        const heatmap = await (0, heatmap_service_1.generateUnifiedHeatmap)(studentId, student.batch_id);
        // Get heatmap start month for frontend
        const heatmapStartMonth = await (0, heatmap_service_1.getBatchStartMonth)(student.batch_id);
        // 4️⃣ Get today's submission count and question availability
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const todaySubmission = heatmap.find((h) => h.date === todayStr);
        const count = todaySubmission ? Number(todaySubmission.count) : 0;
        // Check if any question was uploaded today for this student's batch
        const hasQuestionResult = await (0, heatmap_service_1.getTodayQuestionAvailability)(student.batch_id);
        return {
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
                count: count,
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
            heatmapStartMonth: heatmapStartMonth.toISOString().split('T')[0],
            recentActivity: recentActivity.map((a) => ({
                question_name: a.question.question_name,
                question_link: a.question.question_link,
                difficulty: a.question.level,
                solvedAt: a.sync_at
            }))
        };
    }
    catch (error) {
        throw new ApiError_1.ApiError(400, "Student profile retrieval failed: " +
            (error instanceof Error ? error.message : String(error)));
    }
};
exports.getStudentProfileService = getStudentProfileService;
const getPublicStudentProfileService = async (username) => {
    const student = await prisma_1.default.student.findUnique({
        where: { username },
        select: {
            id: true,
            name: true,
            username: true,
            enrollment_id: true,
            github: true,
            linkedin: true,
            leetcode_id: true,
            gfg_id: true,
            profile_image_url: true,
            batch_id: true,
            city: true,
            batch: true,
            leaderboards: true,
            _count: {
                select: {
                    progress: true
                }
            }
        }
    });
    if (!student) {
        throw new ApiError_1.ApiError(404, "Student not found");
    }
    const studentId = student.id;
    // Get batch question counts for all levels
    const batchQuestionCounts = await prisma_1.default.batch.findUnique({
        where: { id: student.batch_id },
        select: {
            easy_assigned: true,
            medium_assigned: true,
            hard_assigned: true
        }
    });
    const recentActivity = await prisma_1.default.studentProgress.findMany({
        where: { student_id: studentId },
        include: {
            question: {
                select: {
                    question_name: true,
                    level: true,
                    question_link: true
                }
            }
        },
        orderBy: {
            sync_at: "desc"
        },
        take: 5
    });
    const leaderboard = student.leaderboards;
    // 3️⃣ Unified Heatmap with Dynamic Start Date
    const heatmap = await (0, heatmap_service_1.generateUnifiedHeatmap)(studentId, student.batch_id);
    // Get heatmap start month for frontend
    const heatmapStartMonth = await (0, heatmap_service_1.getBatchStartMonth)(student.batch_id);
    return {
        student: {
            id: student.id,
            name: student.name,
            username: student.username,
            enrollmentId: student.enrollment_id,
            city: student.city?.city_name || null,
            batch: student.batch?.batch_name || null,
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
            maxStreak: leaderboard?.max_streak || 0
        },
        leaderboard: {
            globalRank: leaderboard?.alltime_global_rank || 0,
            cityRank: leaderboard?.alltime_city_rank || 0
        },
        heatmap: heatmap.map((h) => ({
            date: h.date,
            count: Number(h.count)
        })),
        heatmapStartMonth: heatmapStartMonth.toISOString().split('T')[0],
        recentActivity: recentActivity.map((a) => ({
            question_name: a.question.question_name,
            question_link: a.question.question_link,
            difficulty: a.question.level,
            solvedAt: a.sync_at
        }))
    };
};
exports.getPublicStudentProfileService = getPublicStudentProfileService;
