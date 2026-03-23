import { Request, Response } from "express";
import { getLeaderboardWithPagination, getStudentRankDirect, getAvailableYears } from "../services/leaderboard.service";
import { syncLeaderboardData } from "../services/leaderboardSync.service";
import prisma from "../config/prisma";

// Get available years for leaderboard filters
export const getAvailableYearsController = async (req: Request, res: Response) => {
    try {
        const years = await getAvailableYears();
        return res.status(200).json({
            success: true,
            years: years
        });
    } catch (error) {
        console.error("Error fetching available years:", error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to fetch available years"
        });
    }
};

// Admin Leaderboard API with pagination and search
export const getAdminLeaderboard = async (req: Request, res: Response) => {
    try {
        // Step 1 — Read filters from request body
        const body = req.body || {};
        const { city, type, year } = body;
        
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
        const result = await getLeaderboardWithPagination(filters, pagination, search as string);
        
        // Step 6 — Format leaderboard with explicitly requested data mapping
        const formattedLeaderboard = result.leaderboard.map(entry => {
            // Determine which rank fields to use based on type
            let globalRank, cityRank;
            switch(filters.type) {
                case 'weekly':
                    globalRank = entry.weekly_global_rank;
                    cityRank = entry.weekly_city_rank;
                    break;
                case 'monthly':
                    globalRank = entry.monthly_global_rank;
                    cityRank = entry.monthly_city_rank;
                    break;
                default: // 'all' or 'alltime'
                    globalRank = entry.alltime_global_rank;
                    cityRank = entry.alltime_city_rank;
            }
            
            return {
                student_id: entry.student_id,
                name: entry.name,
                username: entry.username,
                batch_year: entry.batch_year,
                city_name: entry.city_name,
                profile_image_url: entry.profile_image_url || null,
                max_streak: entry.max_streak || 0,
                easy_completion: Number(entry.easy_completion || 0),
                medium_completion: Number(entry.medium_completion || 0),
                hard_completion: Number(entry.hard_completion || 0),
                total_solved: Number(entry.total_solved || 0),
                score: Number(entry.score || 0),
                global_rank: globalRank,
                city_rank: cityRank,
                last_calculated: entry.last_calculated
            };
        });
        
        return res.status(200).json({
            success: true,
            page: result.pagination.page,
            limit: result.pagination.limit,
            total: result.pagination.total,
            totalPages: result.pagination.totalPages,
            leaderboard: formattedLeaderboard
        });

    } catch (error) {
        console.error("Admin leaderboard error:", error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "An error occurred"
        });
    }
};

// Student Leaderboard API with top 10 and personal rank
export const getStudentLeaderboard = async (req: Request, res: Response) => {
    try {
        // Step 1 — Get student ID from auth middleware
        const studentId = (req as any).studentId;
        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "Student ID not found in request."
            });
        }
        
        // Step 2 — Read filters from request body or query params
        const body = req.body || {};
        const { city, type, year } = body;
        
        // Step 3 — Read query params (optional username search)
        const { username } = req.query;
        
        // Step 4 — Get student's batch year for validation
        const student = await prisma.student.findUnique({
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
        let search = username as string;
        
        const top10Result = await getLeaderboardWithPagination(filters, pagination, search);
        
        // Step 8 — Format top10 leaderboard with explicitly requested data mapping
        const formattedTop10 = top10Result.leaderboard.map(entry => {
            // Determine which rank fields to use based on type
            let globalRank, cityRank;
            switch(filters.type) {
                case 'weekly':
                    globalRank = entry.weekly_global_rank;
                    cityRank = entry.weekly_city_rank;
                    break;
                case 'monthly':
                    globalRank = entry.monthly_global_rank;
                    cityRank = entry.monthly_city_rank;
                    break;
                default: // 'all' or 'alltime'
                    globalRank = entry.alltime_global_rank;
                    cityRank = entry.alltime_city_rank;
            }
            
            return {
                student_id: entry.student_id,
                name: entry.name,
                username: entry.username,
                batch_year: entry.batch_year,
                city_name: entry.city_name,
                max_streak: entry.max_streak || 0,
                easy_completion: Number(entry.easy_completion || 0),
                medium_completion: Number(entry.medium_completion || 0),
                hard_completion: Number(entry.hard_completion || 0),
                total_solved: Number(entry.total_solved || 0),
                score: Number(entry.score || 0),
                global_rank: globalRank,
                city_rank: cityRank,
                last_calculated: entry.last_calculated
            };
        });
        
        // Step 9 — Get logged-in student's rank using direct query
        const studentEntry = await getStudentRankDirect(studentId, filters);
        
        // Step 10 — Prepare yourRank response with simplified data
        let yourRank = null;
        let rankMessage = null;
        
        if (studentEntry) {
            // The getStudentRankDirect already returns the correct rank fields based on type
            const globalRank = studentEntry.global_rank;
            const cityRank = studentEntry.city_rank;
            
            // Handle potential null/undefined values in completion percentages
                const easyCompletion = parseFloat(studentEntry.easy_completion) || 0;
                const mediumCompletion = parseFloat(studentEntry.medium_completion) || 0;
                const hardCompletion = parseFloat(studentEntry.hard_completion) || 0;
                
                const totalCompletion = ((easyCompletion + mediumCompletion + hardCompletion) / 3).toFixed(2);
                
                yourRank = {
                    rank: filters.city === 'all' ? globalRank : cityRank,
                    student_id: studentId,
                    name: student.name,
                    username: student.username,
                    batch_year: student.batch?.year,
                    city_name: studentEntry.city_name,
                    max_streak: studentEntry.max_streak,
                    easy_solved: easyCompletion,
                    medium_solved: mediumCompletion,
                    hard_solved: hardCompletion,
                    total_solved: totalCompletion
                };
        } else {
            // Check if year mismatch
            if (year && year !== student.batch?.year) {
                rankMessage = `Student belongs to ${student.batch?.year} batch, but ${year} data requested`;
            } else {
                rankMessage = "Student rank not found in current filters";
            }
        }
        
        return res.status(200).json({
            success: true,
            top10: formattedTop10,
            yourRank,
            message: rankMessage,
            filters: {
                city: filters.city,
                year: filters.year,
                type: filters.type
            }
        });

    } catch (error) {
        console.error("Student leaderboard error:", error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "An error occurred"
        });
    }
};

// Legacy endpoints for backward compatibility
export const getLeaderboardPost = async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const { city, year, type } = body;
        
        const query = {
            type: type || 'all',
            city: city || 'all',
            year: year || new Date().getFullYear()
        };

        // For backward compatibility, get first page without pagination
        const pagination = { page: 1, limit: 100 };
        const result = await getLeaderboardWithPagination(query, pagination, null);

        return res.status(200).json({
            success: true,
            data: result.leaderboard
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "An error occurred"
        });
    }
};

export const getLeaderboardByType = async (req: Request, res: Response) => {
    try {
        const studentId = (req as any).studentId;
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
        const leaderboardResult = await getLeaderboardWithPagination(query, pagination, null);
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
                hard_completion: studentEntry.hard_completion,
                medium_completion: studentEntry.medium_completion,
                easy_completion: studentEntry.easy_completion
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

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "An error occurred"
        });
    }
};
