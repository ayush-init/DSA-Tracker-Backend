import prisma from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export const getStudentProfileService = async (studentId: number) => {
    try {

        // 1️⃣ Get student basic info + leaderboard
        const student = await prisma.student.findUnique({
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
            throw new ApiError(400, "Student not found");
        }

        // Get batch question counts for all levels
        const batchQuestionCounts = await prisma.batch.findUnique({
            where: { id: student.batch_id! },
            select: {
                easy_assigned: true,
                medium_assigned: true,
                hard_assigned: true
            }
        });

        const leaderboard = student.leaderboards;

        // 2️⃣ Get recent activity
        const recentActivity = await prisma.studentProgress.findMany({
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

        // 3️⃣ Heatmap
        const heatmap = await prisma.$queryRaw`
      SELECT DATE(sync_at) as date, COUNT(*) as count
      FROM "StudentProgress"
      WHERE student_id = ${studentId}
      GROUP BY DATE(sync_at)
      ORDER BY date DESC
    ` as any[];

        // 4️⃣ Get today's submission count and check if questions were uploaded today
        const today = new Date().toISOString().split('T')[0];
        const todaySubmission = heatmap.find((h: any) => h.date === today);
        const count = todaySubmission ? Number(todaySubmission.count) : 0;

        // Check if any question was uploaded today for this student's batch + city
        const hasQuestion = await prisma.$queryRaw`
      SELECT EXISTS(
        SELECT 1 
        FROM "Question" q
        JOIN "Topic" t ON q.topic_id = t.id
        JOIN "Class" c ON t.id = c.topic_id
        WHERE DATE(q.created_at) = ${today}
        AND c.batch_id = ${student.batch_id}
        AND (
          ${student.city?.id} IS NULL 
          OR EXISTS (
            SELECT 1 FROM "City" city 
            WHERE city.id = ${student.city?.id}
          )
        )
      ) as has_question
    ` as any[];

        const hasQuestionResult = hasQuestion.length > 0 ? Boolean(hasQuestion[0].has_question) : false;

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

            recentActivity: recentActivity.map((a) => ({
                question_name: a.question.question_name,
                question_link: a.question.question_link,
                difficulty: a.question.level,
                solvedAt: a.sync_at
            }))
        };

    } catch (error) {
        throw new ApiError(400, 
                        "Student profile retrieval failed: " +
                        (error instanceof Error ? error.message : String(error))
                    );
    }
};


export const getPublicStudentProfileService = async (username: string) => {

    const student = await prisma.student.findUnique({
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
        throw new ApiError(404, "Student not found");
    }

    const studentId = student.id;

    // Get batch question counts for all levels
    const batchQuestionCounts = await prisma.batch.findUnique({
        where: { id: student.batch_id! },
        select: {
            easy_assigned: true,
            medium_assigned: true,
            hard_assigned: true
        }
    });

    const recentActivity = await prisma.studentProgress.findMany({
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

    const heatmap = await prisma.$queryRaw`
      SELECT DATE(sync_at) as date, COUNT(*) as count
      FROM "StudentProgress"
      WHERE student_id = ${studentId}
      GROUP BY DATE(sync_at)
      ORDER BY date DESC
    ` as any[];

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

        recentActivity: recentActivity.map((a) => ({
            question_name: a.question.question_name,
            question_link: a.question.question_link,
            difficulty: a.question.level,
            solvedAt: a.sync_at
        }))
    };
};