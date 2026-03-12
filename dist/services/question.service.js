"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssignedQuestionsService = exports.deleteQuestionService = exports.updateQuestionService = exports.getAllQuestionsService = exports.createQuestionService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../config/prisma"));
const detectPlatform = (link) => {
    const normalized = link.toLowerCase();
    if (normalized.includes("leetcode.com"))
        return client_1.Platform.LEETCODE;
    if (normalized.includes("geeksforgeeks.org"))
        return client_1.Platform.GFG;
    if (normalized.includes("interviewbit.com"))
        return client_1.Platform.INTERVIEWBIT;
    return client_1.Platform.OTHER;
};
const createQuestionService = async ({ question_name, question_link, topic_id, platform, level = "MEDIUM", type = "HOMEWORK", }) => {
    if (!question_name || !question_link || !topic_id) {
        throw new Error("All required fields must be provided");
    }
    // Validate topic
    const topic = await prisma_1.default.topic.findUnique({
        where: { id: topic_id },
    });
    if (!topic) {
        throw new Error("Topic not found");
    }
    // Auto detect platform if not provided
    const finalPlatform = platform ?? detectPlatform(question_link);
    // Prevent duplicate question link
    const duplicate = await prisma_1.default.question.findFirst({
        where: {
            question_link,
            topic_id,
        },
    });
    if (duplicate) {
        throw new Error("Question already exists for this topic");
    }
    const question = await prisma_1.default.question.create({
        data: {
            question_name,
            question_link,
            topic_id,
            platform: finalPlatform,
            level,
            type,
        },
    });
    return question;
};
exports.createQuestionService = createQuestionService;
const getAllQuestionsService = async ({ topicSlug, level, platform, type, search, page = 1, limit = 10, }) => {
    const where = {};
    // 🔎 Topic filter
    if (topicSlug) {
        const topic = await prisma_1.default.topic.findUnique({
            where: { slug: topicSlug },
        });
        if (!topic) {
            throw new Error("Topic not found");
        }
        where.topic_id = topic.id;
    }
    // 🔎 Level filter
    if (level) {
        where.level = level;
    }
    // 🔎 Platform filter
    if (platform) {
        where.platform = platform;
    }
    // 🔎 Type filter
    if (type) {
        where.type = type;
    }
    // 🔎 Search filter
    if (search) {
        where.question_name = {
            contains: search,
            mode: "insensitive",
        };
    }
    const skip = (page - 1) * limit;
    const [questions, total] = await prisma_1.default.$transaction([
        prisma_1.default.question.findMany({
            where,
            include: {
                topic: {
                    select: {
                        topic_name: true,
                        slug: true,
                    },
                },
            },
            orderBy: {
                created_at: "desc",
            },
            skip,
            take: limit,
        }),
        prisma_1.default.question.count({ where }),
    ]);
    return {
        data: questions,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};
exports.getAllQuestionsService = getAllQuestionsService;
const updateQuestionService = async ({ id, question_name, question_link, topic_id, level, platform, type, }) => {
    const existing = await prisma_1.default.question.findUnique({
        where: { id },
    });
    if (!existing) {
        throw new Error("Question not found");
    }
    const finalTopicId = topic_id ?? existing.topic_id;
    // Validate topic if changed
    if (topic_id) {
        const topic = await prisma_1.default.topic.findUnique({
            where: { id: topic_id },
        });
        if (!topic) {
            throw new Error("Topic not found");
        }
    }
    const finalLink = question_link ?? existing.question_link;
    // Prevent duplicate link inside same topic
    const duplicate = await prisma_1.default.question.findFirst({
        where: {
            question_link: finalLink,
            topic_id: finalTopicId,
            NOT: { id: existing.id },
        },
    });
    if (duplicate) {
        throw new Error("Question with same link already exists in this topic");
    }
    const updated = await prisma_1.default.question.update({
        where: { id },
        data: {
            question_name: question_name ?? existing.question_name,
            question_link: finalLink,
            topic_id: finalTopicId,
            level: level ?? existing.level,
            platform: platform ?? existing.platform,
            type: type ?? existing.type,
        },
    });
    return updated;
};
exports.updateQuestionService = updateQuestionService;
const deleteQuestionService = async ({ id, }) => {
    const existing = await prisma_1.default.question.findUnique({
        where: { id },
    });
    if (!existing) {
        throw new Error("Question not found");
    }
    const visibilityCount = await prisma_1.default.questionVisibility.count({
        where: { question_id: id },
    });
    if (visibilityCount > 0) {
        throw new Error("Cannot delete question assigned to classes");
    }
    const progressCount = await prisma_1.default.studentProgress.count({
        where: { question_id: id },
    });
    if (progressCount > 0) {
        throw new Error("Cannot delete question with student progress");
    }
    await prisma_1.default.question.delete({
        where: { id },
    });
    return true;
};
exports.deleteQuestionService = deleteQuestionService;
const getAssignedQuestionsService = async (query) => {
    try {
        const { city, batch, year } = query;
        const batchFilter = {};
        // -----------------------------
        // CITY FILTER
        // -----------------------------
        if (city) {
            const cityExists = await prisma_1.default.city.findUnique({
                where: { city_name: city }
            });
            if (!cityExists) {
                throw new Error("Invalid city");
            }
            batchFilter.city = {
                city_name: city
            };
        }
        // -----------------------------
        // BATCH FILTER
        // -----------------------------
        if (batch) {
            const batchExists = await prisma_1.default.batch.findUnique({
                where: {
                    slug: batch
                }
            });
            if (!batchExists) {
                throw new Error("Invalid batch");
            }
            batchFilter.batch_name = batch;
        }
        // -----------------------------
        // YEAR FILTER
        // -----------------------------
        if (year) {
            const parsedYear = Number(year);
            if (isNaN(parsedYear)) {
                throw new Error("Year must be a number");
            }
            batchFilter.year = parsedYear;
        }
        // -----------------------------
        // FETCH BATCHES
        // -----------------------------
        const batches = await prisma_1.default.batch.findMany({
            where: batchFilter,
            select: { id: true }
        });
        if (batch && batches.length === 0) {
            throw new Error("Batch not found");
        }
        const batchIds = batches.map(b => b.id);
        // -----------------------------
        // FETCH ASSIGNED QUESTIONS
        // -----------------------------
        const questions = await prisma_1.default.question.findMany({
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
                question_name: true,
                platform: true,
                level: true,
                type: true,
                topic: {
                    select: {
                        topic_name: true
                    }
                }
            }
        });
        // -----------------------------
        // ANALYTICS
        // -----------------------------
        const platformStats = { leetcode: 0, gfg: 0 };
        const difficultyStats = { easy: 0, medium: 0, hard: 0 };
        const typeStats = { homework: 0, classwork: 0 };
        questions.forEach(q => {
            if (q.platform === "LEETCODE")
                platformStats.leetcode++;
            if (q.platform === "GFG")
                platformStats.gfg++;
            if (q.level === "EASY")
                difficultyStats.easy++;
            if (q.level === "MEDIUM")
                difficultyStats.medium++;
            if (q.level === "HARD")
                difficultyStats.hard++;
            if (q.type === "HOMEWORK")
                typeStats.homework++;
            if (q.type === "CLASSWORK")
                typeStats.classwork++;
        });
        return {
            totalQuestions: questions.length,
            analytics: {
                platforms: platformStats,
                difficulty: difficultyStats,
                type: typeStats
            },
            questions
        };
    }
    catch (error) {
        throw new Error("Failed to fetch assigned questions");
    }
};
exports.getAssignedQuestionsService = getAssignedQuestionsService;
