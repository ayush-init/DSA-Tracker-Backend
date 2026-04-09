/**
 * Leaderboard Controller - Student ranking and competition endpoints
 * Handles leaderboard queries for students and admins with filtering and pagination
 * Provides competitive ranking data for motivation and progress tracking
 */

import { Request, Response } from "express";
import { getAvailableYears } from "../services/leaderboard/leaderboard-data.service";
import { getAdminLeaderboard as getAdminLeaderboardService } from "../services/leaderboard/adminLeaderboard.service";
import { getStudentLeaderboard as getStudentLeaderboardService } from "../services/leaderboard/studentLeaderboard.service";
import prisma from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ExtendedRequest } from "../types";

// Get available years for leaderboard filters
export const getAvailableYearsController = asyncHandler(async (req: Request, res: Response) => {
    const years = await getAvailableYears();
    return res.status(200).json({
        success: true,
        years: years
    });
});

// Admin Leaderboard API with pagination and search
export const getAdminLeaderboard = asyncHandler(async (req: Request, res: Response) => {
    // Step 1 — Read filters from request body
    const body = req.body || {};
    const { city, year } = body;
    
    // Step 2 — Read query params for pagination and search
    const { page = 1, limit = 10, search } = req.query;
    
    // Step 3 — Prepare filters
    const filters = {
        city: city || 'all', 
        year: year || new Date().getFullYear()
    };
    
    // Step 4 - Prepare pagination
    const pagination = {
        page: Number(page),
        limit: Number(limit)
    };
    
    // Step 5 — Use optimized service
    const result = await getAdminLeaderboardService(filters, pagination, search as string);
    
    // Step 6 — Format leaderboard with all-time rankings
    const formattedLeaderboard = result.leaderboard.map(entry => {
        return {
            student_id: entry.student_id,
            name: entry.name,
            username: entry.username,
            batch_year: entry.batch_year,
            city_name: entry.city_name,
            profile_image_url: entry.profile_image_url || null,
            max_streak: entry.max_streak || 0,
            total_solved: Number(entry.total_solved || 0),
            score: Number(entry.score || 0),
            global_rank: entry.alltime_global_rank,
            city_rank: entry.alltime_city_rank
        };
    });
    
    return res.status(200).json({
        success: true,
        data: {
            leaderboard: formattedLeaderboard,
            total: result.pagination.total,
            page: result.pagination.page,
            limit: result.pagination.limit,
            available_cities: result.available_cities,
            last_calculated: result.last_calculated
        }
    });
});

// Student Leaderboard API with top 10 and personal rank
export const getStudentLeaderboard = asyncHandler(async (req: ExtendedRequest, res: Response) => {
    // Step 1 — Get student data from auth middleware (JWT)
    const studentId = req.studentId;
    const cityId = req.cityId;
    const batchId = req.batchId;
    const batchName = req.batchName;
    
    // Extract batch year from batchName (e.g., "2024-2025" → 2024)
    const batchYear = batchName ? parseInt(batchName.split("-")[0]) : new Date().getFullYear();
    
    if (!studentId || !cityId || !batchId) {
        return res.status(400).json({
            success: false,
            message: "Student data not found in JWT."
        });
    }
    
    // Step 2 — Get filters from request body
    const body = req.body || {};
    const { city, year, username } = body;
    
    // Step 3 — Prepare JWT data and filters
    const jwtData = {
        studentId,
        cityId,
        batchId,
        batchYear
    };
    
    const filters = {
        city: city || 'all',
        year: year || batchYear
    };
    
    // Step 4 — Fetch using optimized service (no extra Prisma queries)
    const result = await getStudentLeaderboardService(jwtData, filters, username);

    // Step 6 — Format top10 leaderboard
    const formattedTop10 = result.top10.map((entry: any) => {
        return {
            student_id: entry.student_id,
            name: entry.name,
            username: entry.username,
            profile_image_url: entry.profile_image_url,
            batch_year: entry.batch_year,
            city_name: entry.city_name,
            max_streak: entry.max_streak || 0,
            total_solved: Number(entry.total_solved || 0),
            score: Number(entry.score || 0),
            global_rank: entry.alltime_global_rank,
            city_rank: entry.alltime_city_rank
        };
    });

    return res.status(200).json({
        success: true,
        data: {
            top10: formattedTop10,
            yourRank: result.yourRank,
            message: result.message,
            filters: result.filters,
            available_cities: result.available_cities,
            last_calculated: result.last_calculated
        }
    });
});

// Legacy endpoints for backward compatibility
export const getLeaderboardPost = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body || {};
    const { city, year, type } = body;
    
    const query = {
        type: type || 'all',
        city: city || 'all',
        year: year || new Date().getFullYear()
    };

    // For backward compatibility, get first page without pagination
    const pagination = { page: 1, limit: 100 };
    const result = await getAdminLeaderboardService(query, pagination, undefined);

    return res.status(200).json({
        success: true,
        data: result.leaderboard
    });
});

export const getLeaderboardByType = asyncHandler(async (req: ExtendedRequest, res: Response) => {
    const studentId = req.studentId;
    if (!studentId) {
        return res.status(400).json({
            success: false,
            message: "Student ID not found in request."
        });
    }
    
    const body = req.body || {};
    const { type, city, year } = body;
    
    const query = {
        type: type || 'all',
        city: city || 'all',
        year: year || new Date().getFullYear()
    };

    // Get leaderboard data
    const pagination = { page: 1, limit: 100 };
    const leaderboardResult = await getAdminLeaderboardService(query, pagination, undefined);
    const leaderboard = leaderboardResult.leaderboard;

        // Find the student's rank in the leaderboard
        const studentEntry = leaderboard.find((entry: any) => entry.student_id === studentId);
        
        // Get detailed student progress information
        const studentProgress = await prisma.studentProgress.findMany({
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
                sync_at: "desc" as any
            }
        });

        // Calculate statistics
        const totalSolved = studentProgress.length;
        const easySolved = studentProgress.filter((p: any) => p.question.level === 'EASY').length;
        const mediumSolved = studentProgress.filter((p: any) => p.question.level === 'MEDIUM').length;
        const hardSolved = studentProgress.filter((p: any) => p.question.level === 'HARD').length;
        
        // Get student's basic info
        const student = await prisma.student.findUnique({
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
            global_rank: studentEntry.alltime_global_rank,
            city_rank: studentEntry.alltime_city_rank,
            student_details: {
                student_id: studentId,
                name: student?.name || '',
                username: student?.username || '',
                profile_image_url: student?.profile_image_url || '',
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
                global_rank: studentEntry.alltime_global_rank,
                city_rank: studentEntry.alltime_city_rank,
                score: studentEntry.score,
                max_streak: studentEntry.max_streak,
                total_solved: studentEntry.total_solved,

            },
            problem_solving_stats: {
                total_questions_solved: totalSolved,
                easy_solved: easySolved,
                medium_solved: mediumSolved,
                hard_solved: hardSolved,
                recent_solutions: studentProgress.slice(0, 10).map((p: any) => ({
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
});