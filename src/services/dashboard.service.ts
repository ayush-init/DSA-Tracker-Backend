import prisma from "../config/prisma";

export const getDashboardService = async (query: any) => {

    try {

        const { city, batch, year } = query;

        const batchFilter: any = {};

        if (city) {
            batchFilter.city = {
                slug: city
            };
        }

        if (batch) {
            batchFilter.slug = batch;
        }

        if (year) {
            batchFilter.year = Number(year);
        }

        const batches = await prisma.batch.findMany({
            where: batchFilter,
            select: { id: true }
        });

        const batchIds = batches.map(b => b.id);

        const [
            totalCities,
            totalStudents,
            assignedQuestions,
            solvedQuestions,
            cityStats,
            batchStats
        ] = await Promise.all([

            prisma.city.count(),

            prisma.student.count({
                where: {
                    batch_id: {
                        in: batchIds.length ? batchIds : undefined
                    }
                }
            }),

            prisma.question.findMany({
                where: {
                    visibility: {
                        some: {
                            class: {
                                batch_id: {
                                    in: batchIds.length ? batchIds : undefined
                                }
                            }
                        }
                    }
                },
                select: {
                    id: true,
                    platform: true,
                    level: true,
                    type: true
                }
            }),

            prisma.studentProgress.findMany({
                where: {
                    student: {
                        batch_id: {
                            in: batchIds.length ? batchIds : undefined
                        }
                    }
                },
                include: {
                    question: {
                        select: {
                            platform: true,
                            level: true,
                            type: true
                        }
                    }
                }
            }),

            prisma.city.findMany({
                include: {
                    batches: {
                        include: {
                            students: true
                        }
                    }
                }
            }),

            prisma.batch.findMany({
                where: batchFilter,
                include: {
                    city: true,
                    students: true
                }
            })

        ]);

        // -----------------------------
        // ASSIGNED QUESTION ANALYTICS
        // -----------------------------

        const platformStats = { leetcode: 0, gfg: 0 };

        const difficultyStats = { easy: 0, medium: 0, hard: 0 };

        const typeStats = { homework: 0, classwork: 0 };

        assignedQuestions.forEach(q => {

            if (q.platform === "LEETCODE") platformStats.leetcode++;
            if (q.platform === "GFG") platformStats.gfg++;

            if (q.level === "EASY") difficultyStats.easy++;
            if (q.level === "MEDIUM") difficultyStats.medium++;
            if (q.level === "HARD") difficultyStats.hard++;

            if (q.type === "HOMEWORK") typeStats.homework++;
            if (q.type === "CLASSWORK") typeStats.classwork++;

        });

        // -----------------------------
        // SOLVED QUESTION ANALYTICS
        // -----------------------------

        const solvedStats = {
            leetcode: { easy: 0, medium: 0, hard: 0 },
            gfg: { easy: 0, medium: 0, hard: 0 }
        };

        solvedQuestions.forEach(s => {

            const q = s.question;

            const platform =
                q.platform === "LEETCODE"
                    ? "leetcode"
                    : q.platform === "GFG"
                        ? "gfg"
                        : null;

            if (!platform) return;

            if (q.level === "EASY") solvedStats[platform].easy++;
            if (q.level === "MEDIUM") solvedStats[platform].medium++;
            if (q.level === "HARD") solvedStats[platform].hard++;

        });

        // -----------------------------
        // CITY ANALYTICS
        // -----------------------------

        const formattedCityStats = cityStats.map(city => {

            let studentCount = 0;

            city.batches.forEach(batch => {
                studentCount += batch.students.length;
            });

            return {
                city: city.city_name,
                totalBatches: city.batches.length,
                totalStudents: studentCount
            };
        });

        // -----------------------------
        // BATCH ANALYTICS
        // -----------------------------

        const formattedBatchStats = batchStats.map(batch => ({
            batch: batch.batch_name,
            year: batch.year,
            city: batch.city?.city_name,
            totalStudents: batch.students.length
        }));

        return {

            overview: {
                totalCities,
                totalStudents,
                totalAssignedQuestions: assignedQuestions.length
            },

            assignedQuestions: {
                platforms: platformStats,
                difficulty: difficultyStats,
                type: typeStats
            },

            solvedQuestions: solvedStats,

            cityStats: formattedCityStats,

            batchStats: formattedBatchStats

        };

    } catch (error) {

        throw new Error("Dashboard data fetch failed");

    }
};