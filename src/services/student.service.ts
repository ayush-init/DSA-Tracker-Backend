import prisma from "../config/prisma";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";


// ==============================
// GET ALL STUDENTS
// ==============================

export const getAllStudentsService = async (query: any) => {
    try {

        const { 
            search, 
            city, 
            batchSlug, 
            sortBy = "created_at", 
            order = "desc",
            page = 1,
            limit = 10,
            minGlobalRank,
            maxGlobalRank,
            minCityRank,
            maxCityRank
        } = query;

        const where: any = {};

        // search filter
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { username: { contains: search, mode: "insensitive" } },
                { enrollment_id: { contains: search, mode: "insensitive" } },
            ];
        }

        // city filter
        if (city) {
            where.city = {
                city_name: city,
            };
        }

        // batch filter
        if (batchSlug) {
            where.batch = {
                slug: batchSlug,
            };
        }

        // dynamic sorting
        let orderBy: any = {
            [sortBy]: order === "asc" ? "asc" : "desc"
        };

        // special case → total solved questions
        if (sortBy === "totalSolved") {
            orderBy = {
                progress: {
                    _count: order === "asc" ? "asc" : "desc"
                }
            };
        }

        // pagination
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [students, totalCount] = await Promise.all([
            // Get students with pagination
            prisma.student.findMany({
                where,
                include: {
                    city: true,
                    batch: true,
                    _count: {
                        select: {
                            progress: true
                        }
                    }
                },
                orderBy,
                skip,
                take
            }),
            // Get total count for pagination
            prisma.student.count({ where })
        ]);

        // Get leaderboard data separately with rank filters
        const studentIds = students.map(s => s.id);
        let leaderboardQuery = `
            SELECT 
                student_id,
                alltime_global_rank as global_rank,
                alltime_city_rank as city_rank
            FROM "Leaderboard"
            WHERE student_id = ANY($1)
        `;

        // Add rank filters if provided
        const rankFilters = [];
        if (minGlobalRank) rankFilters.push(`alltime_global_rank >= ${Number(minGlobalRank)}`);
        if (maxGlobalRank) rankFilters.push(`alltime_global_rank <= ${Number(maxGlobalRank)}`);
        if (minCityRank) rankFilters.push(`alltime_city_rank >= ${Number(minCityRank)}`);
        if (maxCityRank) rankFilters.push(`alltime_city_rank <= ${Number(maxCityRank)}`);
        
        if (rankFilters.length > 0) {
            leaderboardQuery += ` AND ${rankFilters.join(' AND ')}`;
        }

        const leaderboardData = await prisma.$queryRawUnsafe(leaderboardQuery, studentIds);

        // Create a map for quick lookup
        const leaderboardMap = new Map(
            (leaderboardData as any[]).map(entry => [entry.student_id, entry])
        );

        // Filter students based on rank availability if rank filters are applied
        let filteredStudents = students;
        if (rankFilters.length > 0) {
            filteredStudents = students.filter(student => 
                leaderboardMap.has(student.id)
            );
        }

        const formatted = filteredStudents.map((student) => {
            const leaderboard = leaderboardMap.get(student.id);
            return {
                id: student.id,
                name: student.name,
                email: student.email,
                username: student.username,
                enrollment_id: student.enrollment_id,

                city: student.city?.city_name || null,
                batch: student.batch?.batch_name || null,

                leetcode_id: student.leetcode_id,
                gfg_id: student.gfg_id,

                github: student.github,
                linkedin: student.linkedin,

                gfg_total_solved: student.gfg_total_solved,
                lc_total_solved: student.lc_total_solved,

                totalSolved: student._count.progress,

                // Leaderboard ranks
                global_rank: leaderboard?.global_rank || null,
                city_rank: leaderboard?.city_rank || null,

                provider: student.provider,
                last_synced_at: student.last_synced_at,

                created_at: student.created_at,
                updated_at: student.updated_at
            };
        });

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / take);
        const hasNextPage = Number(page) < totalPages;
        const hasPreviousPage = Number(page) > 1;

        return {
            students: formatted,
            pagination: {
                page: Number(page),
                limit: take,
                total: totalCount,
                totalPages,
                hasNextPage,
                hasPreviousPage
            }
        };

    } catch (error) {
        throw new Error("Failed to fetch students");
    }
};



// ==============================
// GET STUDENT REPORT
// ==============================



export const getStudentReportService = async (username: string) => {
    try {

        const student = await prisma.student.findUnique({
            where: { username },
            include: {
                city: true,
                batch: true,
                progress: {
                    include: {
                        question: {
                            select: {
                                id: true,
                                platform: true,
                                level: true,
                                type: true,
                                topic_id: true,
                                topic: {
                                    select: {
                                        topic_name: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { sync_at: "desc" },
                    take: 5
                }
            }
        });

        if (!student) {
            throw new Error("Student not found");
        }

        const [solvedQuestions, batchQuestions, topics] = await Promise.all([

            // solved questions by student
            prisma.studentProgress.findMany({
                where: { student_id: student.id },
                include: {
                    question: {
                        select: {
                            id: true,
                            platform: true,
                            level: true,
                            type: true,
                            topic_id: true
                        }
                    }
                }
            }),

            // questions assigned to this batch
            prisma.question.findMany({
                where: {
                    visibility: {
                        some: {
                            class: {
                                batch_id: student.batch_id || undefined
                            }
                        }
                    }
                },
                select: {
                    id: true,
                    topic_id: true
                }
            }),

            prisma.topic.findMany({
                select: {
                    id: true,
                    topic_name: true
                }
            })

        ]);

        // ---------- stats calculation ----------

        let totalSolved = solvedQuestions.length;

        const platformStats = {
            leetcode: {
                total: 0,
                easy: 0,
                medium: 0,
                hard: 0,
                homework: 0,
                classwork: 0
            },
            gfg: {
                total: 0,
                easy: 0,
                medium: 0,
                hard: 0,
                homework: 0,
                classwork: 0
            }
        };

        const difficultyStats = {
            easy: 0,
            medium: 0,
            hard: 0
        };

        const typeStats = {
            homework: 0,
            classwork: 0
        };

        const solvedTopicMap: Record<number, number> = {};
        const totalTopicMap: Record<number, number> = {};

        // solved stats
        solvedQuestions.forEach(s => {

            const q = s.question;

            const platform = q.platform === "LEETCODE" ? "leetcode" :
                q.platform === "GFG" ? "gfg" : null;

            if (platform) {

                platformStats[platform].total++;

                if (q.level === "EASY") platformStats[platform].easy++;
                if (q.level === "MEDIUM") platformStats[platform].medium++;
                if (q.level === "HARD") platformStats[platform].hard++;

                if (q.type === "HOMEWORK") platformStats[platform].homework++;
                if (q.type === "CLASSWORK") platformStats[platform].classwork++;
            }

            // existing global stats
            if (q.level === "EASY") difficultyStats.easy++;
            if (q.level === "MEDIUM") difficultyStats.medium++;
            if (q.level === "HARD") difficultyStats.hard++;

            if (q.type === "HOMEWORK") typeStats.homework++;
            if (q.type === "CLASSWORK") typeStats.classwork++;

            solvedTopicMap[q.topic_id] =
                (solvedTopicMap[q.topic_id] || 0) + 1;
        });

        // total questions per topic
        batchQuestions.forEach(q => {
            totalTopicMap[q.topic_id] =
                (totalTopicMap[q.topic_id] || 0) + 1;
        });

        const topicStats = Object.keys(totalTopicMap).map(topicId => {

            const topic = topics.find(t => t.id === Number(topicId));

            return {
                topic: topic?.topic_name || "Unknown",
                totalQuestions: totalTopicMap[Number(topicId)],
                solvedByStudent: solvedTopicMap[Number(topicId)] || 0
            };

        });


        return {
            student: {
                id: student.id,
                name: student.name,
                email: student.email,
                city: student.city?.city_name,

                batch: {
                    batch_name: student.batch?.batch_name,
                    year: student.batch?.year
                },

                created_at: student.created_at
            },

            stats: {
                totalSolved,
                platforms: platformStats,
                difficulty: difficultyStats,
                type: typeStats,
                topicStats
            },

            recentActivity: student.progress
        };

    } catch (error) {
        throw new Error("Failed to fetch student report");
    }
};


// ==============================
// UPDATE STUDENT
// ==============================

export const updateStudentDetailsService = async (id: number, body: any) => {
    try {

        const student = await prisma.student.findUnique({
            where: { id }
        });

        if (!student) {
            throw new Error("Student not found");
        }

        const updateData: any = { ...body };

        const updatedStudent = await prisma.student.update({
            where: { id },
            data: updateData
        });

        return updatedStudent;

    } catch (error: any) {

        if (error instanceof Prisma.PrismaClientKnownRequestError) {

            if (error.code === "P2002") {
                throw new Error("Email, Username or Enrollment ID already exists");
            }

            if (error.code === "P2003") {
                throw new Error("Invalid city or batch reference");
            }

        }

        throw new Error("Failed to update student");
    }
};



// ==============================
// DELETE STUDENT
// ==============================

export const deleteStudentDetailsService = async (id: number) => {
    try {

        const student = await prisma.student.findUnique({
            where: { id }
        });

        if (!student) {
            throw new Error("Student not found");
        }

        await prisma.student.delete({
            where: { id }
        });

        return true;

    } catch (error) {
        throw new Error("Failed to delete student");
    }
};



// ==============================
// CREATE STUDENT
// ==============================

export const createStudentService = async (data: any) => {
    try {

        const {
            name,
            email,
            username,
            password,
            enrollment_id,
            batch_id,
            leetcode_id,
            gfg_id
        } = data;

        // batch exist check karo
        const batch = await prisma.batch.findUnique({
            where: { id: batch_id },
            select: {
                id: true,
                city_id: true
            }
        });

        if (!batch) {
            throw new Error("Batch not found");
        }

        let password_hash = null;

        if (password) {
            password_hash = await bcrypt.hash(password, 10);
        }

        const student = await prisma.student.create({
            data: {
                name,
                email,
                username,
                password_hash,
                enrollment_id,
                batch_id,
                city_id: batch.city_id, // city automatically batch se
                leetcode_id,
                gfg_id
            }
        });

        return student;

    } catch (error: any) {

        if (error instanceof Prisma.PrismaClientKnownRequestError) {

            if (error.code === "P2002") {

                const field = error.meta?.target as string[] | undefined;

                if (field?.includes("email"))
                    throw new Error("Email already exists");

                if (field?.includes("username"))
                    throw new Error("Username already exists");

                if (field?.includes("enrollment_id"))
                    throw new Error("Enrollment ID already exists");

                if (field?.includes("google_id"))
                    throw new Error("Google account already linked");

                throw new Error("Duplicate field detected");
            }

            if (error.code === "P2003") {
                throw new Error("Invalid batch reference");
            }
        }

        throw new Error("Failed to create student");
    }
};

export const addStudentProgressService = async (
    student_id: number,
    question_id: number
) => {
    try {

        // check student
        const student = await prisma.student.findUnique({
            where: { id: student_id }
        });

        if (!student) {
            throw new Error("Student not found");
        }

        // check question
        const question = await prisma.question.findUnique({
            where: { id: question_id }
        });

        if (!question) {
            throw new Error("Question not found");
        }

        // create progress
        const progress = await prisma.studentProgress.create({
            data: {
                student_id,
                question_id
            }
        });

        return progress;

    } catch (error: any) {

        if (error instanceof Prisma.PrismaClientKnownRequestError) {

            // duplicate solved question
            if (error.code === "P2002") {
                throw new Error("Student already solved this question");
            }

            // foreign key error
            if (error.code === "P2003") {
                throw new Error("Invalid student or question reference");
            }

        }

        throw new Error("Failed to add student progress");
    }
};