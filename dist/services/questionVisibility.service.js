"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllQuestionsWithFiltersService = exports.removeQuestionFromClassService = exports.getAssignedQuestionsOfClassService = exports.assignQuestionsToClassService = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const assignQuestionsToClassService = async ({ batchId, topicSlug, classSlug, questionIds, }) => {
    if (!questionIds || questionIds.length === 0) {
        throw new Error("No questions provided");
    }
    // Find topic first
    const topic = await prisma_1.default.topic.findUnique({
        where: { slug: topicSlug },
    });
    if (!topic) {
        throw new Error("Topic not found");
    }
    const cls = await prisma_1.default.class.findFirst({
        where: {
            slug: classSlug,
            batch_id: batchId,
            topic_id: topic.id, // Add topic validation
        },
    });
    if (!cls) {
        throw new Error("Class not found in this topic and batch");
    }
    const data = questionIds.map((qid) => ({
        class_id: cls.id,
        question_id: qid,
    }));
    await prisma_1.default.questionVisibility.createMany({
        data,
        skipDuplicates: true,
    });
    // 🔄 Update batch question counts after assignment
    await updateBatchQuestionCounts(batchId);
    return { assignedCount: questionIds.length };
};
exports.assignQuestionsToClassService = assignQuestionsToClassService;
const getAssignedQuestionsOfClassService = async ({ batchId, topicSlug, classSlug, }) => {
    // Find topic first
    const topic = await prisma_1.default.topic.findUnique({
        where: { slug: topicSlug },
    });
    if (!topic) {
        throw new Error("Topic not found");
    }
    const cls = await prisma_1.default.class.findFirst({
        where: {
            slug: classSlug,
            batch_id: batchId,
            topic_id: topic.id, // Add topic validation
        },
    });
    if (!cls) {
        throw new Error("Class not found in this topic and batch");
    }
    const assigned = await prisma_1.default.questionVisibility.findMany({
        where: {
            class_id: cls.id,
        },
        include: {
            question: {
                include: {
                    topic: {
                        select: { topic_name: true, slug: true },
                    },
                },
            },
        },
        orderBy: {
            assigned_at: "desc",
        },
    });
    return assigned.map((qv) => qv.question);
};
exports.getAssignedQuestionsOfClassService = getAssignedQuestionsOfClassService;
const removeQuestionFromClassService = async ({ batchId, topicSlug, classSlug, questionId, }) => {
    // Find topic first
    const topic = await prisma_1.default.topic.findUnique({
        where: { slug: topicSlug },
    });
    if (!topic) {
        throw new Error("Topic not found");
    }
    const cls = await prisma_1.default.class.findFirst({
        where: {
            slug: classSlug,
            batch_id: batchId,
            topic_id: topic.id, // Add topic validation
        },
    });
    if (!cls) {
        throw new Error("Class not found in this topic and batch");
    }
    await prisma_1.default.questionVisibility.deleteMany({
        where: {
            class_id: cls.id,
            question_id: questionId,
        },
    });
    // 🔄 Update batch question counts after removal
    await updateBatchQuestionCounts(batchId);
    return true;
};
exports.removeQuestionFromClassService = removeQuestionFromClassService;
const getAllQuestionsWithFiltersService = async ({ studentId, batchId, filters }) => {
    // Build where clause for question visibility (questions assigned to this batch)
    const whereClause = {
        class: {
            batch_id: batchId
        }
    };
    // Get all question visibility for this batch
    const questionVisibility = await prisma_1.default.questionVisibility.findMany({
        where: whereClause,
        include: {
            question: {
                include: {
                    topic: {
                        select: {
                            id: true,
                            topic_name: true,
                            slug: true
                        }
                    }
                }
            }
        }
    });
    // Extract unique questions
    const uniqueQuestions = new Map();
    questionVisibility.forEach(qv => {
        if (!uniqueQuestions.has(qv.question_id)) {
            uniqueQuestions.set(qv.question_id, qv.question);
        }
    });
    // Get student's solved questions
    const questionIds = Array.from(uniqueQuestions.keys());
    const studentProgress = await prisma_1.default.studentProgress.findMany({
        where: {
            student_id: studentId,
            question_id: { in: questionIds }
        },
        select: {
            question_id: true,
            sync_at: true
        }
    });
    const solvedQuestionIds = new Set(studentProgress.map(progress => progress.question_id));
    // Convert to array and apply filters
    let questions = Array.from(uniqueQuestions.values()).map((question) => ({
        ...question,
        isSolved: solvedQuestionIds.has(question.id),
        syncAt: solvedQuestionIds.has(question.id)
            ? studentProgress.find(p => p.question_id === question.id)?.sync_at
            : null
    }));
    // Apply filters
    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        questions = questions.filter(q => q.question_name.toLowerCase().includes(searchLower) ||
            q.topic.topic_name.toLowerCase().includes(searchLower));
    }
    if (filters.topic) {
        questions = questions.filter(q => q.topic.slug === filters.topic);
    }
    if (filters.level) {
        questions = questions.filter(q => q.level === filters.level.toUpperCase());
    }
    if (filters.platform) {
        questions = questions.filter(q => q.platform === filters.platform.toUpperCase());
    }
    if (filters.type) {
        questions = questions.filter(q => q.type === filters.type.toUpperCase());
    }
    if (filters.solved) {
        const isSolved = filters.solved === 'true';
        questions = questions.filter(q => q.isSolved === isSolved);
    }
    // Sort by creation date (newest first)
    questions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    // Pagination
    const total = questions.length;
    const startIndex = (filters.page - 1) * filters.limit;
    const endIndex = startIndex + filters.limit;
    const paginatedQuestions = questions.slice(startIndex, endIndex);
    // Get filter options for frontend (based on filtered questions only)
    const filteredTopics = questions.map((q) => q.topic);
    const topics = filteredTopics.filter((topic, index, self) => self.findIndex(t => t.id === topic.id) === index);
    // Extract unique values from filtered questions
    const levels = [...new Set(questions.map((q) => q.level))].sort();
    const platforms = [...new Set(questions.map((q) => q.platform))].sort();
    const types = [...new Set(questions.map((q) => q.type))].sort();
    // Also include all available enum values for complete filter options
    const allLevels = ['EASY', 'MEDIUM', 'HARD'];
    const allPlatforms = ['LEETCODE', 'GFG', 'OTHER', 'INTERVIEWBIT'];
    const allTypes = ['HOMEWORK', 'CLASSWORK'];
    return {
        questions: paginatedQuestions,
        pagination: {
            page: filters.page,
            limit: filters.limit,
            totalQuestions: total,
            totalPages: Math.ceil(total / filters.limit)
        },
        filters: {
            topics,
            levels: allLevels, // All enum values from database
            platforms: allPlatforms, // All enum values from database  
            types: allTypes // All enum values from database
        },
        stats: {
            total,
            solved: questions.filter(q => q.isSolved).length
        }
    };
};
exports.getAllQuestionsWithFiltersService = getAllQuestionsWithFiltersService;
// 🔄 Helper function to update batch question counts
async function updateBatchQuestionCounts(batchId) {
    try {
        // Get all classes for this batch with their assigned questions
        const batchClasses = await prisma_1.default.class.findMany({
            where: { batch_id: batchId },
            include: {
                questionVisibility: {
                    include: {
                        question: {
                            select: { level: true }
                        }
                    }
                }
            }
        });
        // Count questions by difficulty across all classes
        let hardCount = 0;
        let mediumCount = 0;
        let easyCount = 0;
        for (const classItem of batchClasses) {
            for (const qv of classItem.questionVisibility) {
                switch (qv.question.level) {
                    case 'HARD':
                        hardCount++;
                        break;
                    case 'MEDIUM':
                        mediumCount++;
                        break;
                    case 'EASY':
                        easyCount++;
                        break;
                }
            }
        }
        // Update the batch with the new counts
        await prisma_1.default.batch.update({
            where: { id: batchId },
            data: {
                hard_assigned: hardCount,
                medium_assigned: mediumCount,
                easy_assigned: easyCount
            }
        });
        console.log(`✅ Updated batch ${batchId} question counts: H=${hardCount}, M=${mediumCount}, E=${easyCount}`);
    }
    catch (error) {
        console.error(`❌ Failed to update batch ${batchId} question counts:`, error);
        throw error;
    }
}
