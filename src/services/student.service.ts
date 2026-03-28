import prisma from "../config/prisma";
import bcrypt from "bcryptjs";
import { generateUsername } from "../utils/usernameGenerator";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/ApiError";

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
                alltime_city_rank as city_rank,
                easy_solved,
                medium_solved,
                hard_solved
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
                profile_image_url: student.profile_image_url,
                leetcode_id: student.leetcode_id,
                gfg_id: student.gfg_id,
                totalSolved: student._count.progress
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

    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                throw new ApiError(400, "Duplicate entry found", [], "DUPLICATE_ENTRY");
            }
            if (error.code === "P2025") {
                throw new ApiError(404, "Record not found", [], "NOT_FOUND_ERROR");
            }
        }
        throw new ApiError(500, "Failed to fetch students", [], "SERVER_ERROR");
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
            throw new ApiError(400, "Student not found");
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

    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                throw new ApiError(404, "Student not found");
            }
        }
        throw new ApiError(500, "Failed to fetch student report");
    }
};

// UPDATE STUDENT
// ==============================

export const updateStudentDetailsService = async (id: number, body: any) => {
    try {

        const student = await prisma.student.findUnique({
            where: { id }
        });

        if (!student) {
            throw new ApiError(400, "Student not found");
        }

        const updateData: any = { ...body };

        const updatedStudent = await prisma.student.update({
            where: { id },
            data: updateData
        });

        return updatedStudent;

    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                throw new ApiError(404, "Student not found");
            }
            if (error.code === "P2002") {
                throw new ApiError(400, "Email, Username or Enrollment ID already exists");
            }
            if (error.code === "P2003") {
                throw new ApiError(400, "Invalid city or batch reference");
            }
        }
        throw new ApiError(500, "Failed to update student");
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
            throw new ApiError(400, "Student not found");
        }

        await prisma.student.delete({
            where: { id }
        });

        return true;

    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                throw new ApiError(404, "Student not found");
            }
        }
        throw new ApiError(500, "Failed to delete student");
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

        // Only require name and email, username will be generated if not provided
        if (!name || !email) {
            throw new ApiError(400, "Name and email are required");
        }

        // Generate username if not provided
        let finalUsername = username;
        if (!finalUsername) {
            finalUsername = await generateUsername(name, enrollment_id);
        }

        // batch exist check karo
        const batch = await prisma.batch.findUnique({
            where: { id: batch_id },
            select: {
                id: true,
                city_id: true
            }
        });

        if (!batch) {
            throw new ApiError(400, "Batch not found");
        }

        let password_hash = null;

        if (password) {
            password_hash = await bcrypt.hash(password, 10);
        }

        const student = await prisma.student.create({
            data: {
                name,
                email,
                username: finalUsername,
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
                    throw new ApiError(400, "Email already exists");

                if (field?.includes("username"))
                    throw new ApiError(400, "Username already exists");

                if (field?.includes("enrollment_id"))
                    throw new ApiError(400, "Enrollment ID already exists");

                if (field?.includes("google_id"))
                    throw new ApiError(400, "Google account already linked");

                throw new ApiError(400, "Duplicate field detected");
            }

            if (error.code === "P2003") {
                throw new ApiError(400, "Invalid batch reference");
            }
        }

        throw new ApiError(400, "Failed to create student");
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
            throw new ApiError(400, "Student not found");
        }

        // check question
        const question = await prisma.question.findUnique({
            where: { id: question_id }
        });

        if (!question) {
            throw new ApiError(400, "Question not found");
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
                throw new ApiError(400, "Student already solved this question");
            }

            // foreign key error
            if (error.code === "P2003") {
                throw new ApiError(400, "Invalid student or question reference");
            }

        }

        throw new ApiError(400, "Failed to add student progress");
    }
};