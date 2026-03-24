"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopicOverviewWithClassesSummaryService = exports.getTopicsWithBatchProgressService = exports.deleteTopicService = exports.updateTopicService = exports.getTopicsForBatchService = exports.getAllTopicsService = exports.createTopicService = void 0;
const slugify_1 = __importDefault(require("slugify"));
const prisma_1 = __importDefault(require("../config/prisma"));
const s3_service_1 = require("./s3.service");
const createTopicService = async ({ topic_name, photo, }) => {
    if (!topic_name) {
        throw new Error("Topic name is required");
    }
    const baseSlug = (0, slugify_1.default)(topic_name, {
        lower: true,
        strict: true,
    });
    let finalSlug = baseSlug;
    let counter = 1;
    // Ensure global unique slug
    while (await prisma_1.default.topic.findUnique({
        where: { slug: finalSlug },
    })) {
        finalSlug = `${baseSlug}-${counter++}`;
    }
    let photo_url = null;
    let photoKey = null;
    // Upload photo to S3 if provided
    if (photo) {
        try {
            const uploadResult = await s3_service_1.S3Service.uploadFile(photo, 'topics');
            photo_url = uploadResult.url;
            photoKey = uploadResult.key;
        }
        catch (error) {
            throw new Error("Failed to upload photo to S3");
        }
    }
    try {
        const topic = await prisma_1.default.topic.create({
            data: {
                topic_name,
                slug: finalSlug,
                photo_url,
            },
        });
        return topic;
    }
    catch (error) {
        // If database creation fails, clean up uploaded photo
        if (photoKey) {
            try {
                await s3_service_1.S3Service.deleteFile(photoKey);
            }
            catch (cleanupError) {
                console.error("Failed to cleanup photo after database error:", cleanupError);
            }
        }
        if (error.code === "P2002") {
            throw new Error("Topic already exists");
        }
        throw new Error("Failed to create topic");
    }
};
exports.createTopicService = createTopicService;
const getAllTopicsService = async () => {
    const topics = await prisma_1.default.topic.findMany({
        orderBy: { created_at: "desc" },
    });
    return topics;
};
exports.getAllTopicsService = getAllTopicsService;
const getTopicsForBatchService = async ({ batchId, query = {} }) => {
    const topics = await prisma_1.default.topic.findMany({
        include: {
            classes: {
                where: {
                    batch_id: batchId
                },
                include: {
                    questionVisibility: {
                        include: {
                            question: {
                                select: {
                                    id: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    let formatted = topics.map(topic => {
        const uniqueQuestions = new Set();
        topic.classes.forEach(cls => {
            cls.questionVisibility.forEach(qv => {
                uniqueQuestions.add(qv.question.id);
            });
        });
        const latestClassDate = topic.classes.length > 0
            ? new Date(Math.max(...topic.classes.map(cls => new Date(cls.created_at).getTime())))
            : new Date(0);
        const firstClassDate = topic.classes.length > 0
            ? new Date(Math.min(...topic.classes.map(cls => new Date(cls.created_at).getTime())))
            : null; // Fallback to topic creation if no classes
        return {
            id: topic.id,
            topic_name: topic.topic_name,
            slug: topic.slug,
            photo_url: topic.photo_url,
            classCount: topic.classes.length,
            questionCount: uniqueQuestions.size,
            firstClassCreated_at: firstClassDate, // Changed: First class creation date
            latestClassDate: latestClassDate
        };
    });
    // Apply Search
    if (query.search) {
        const st = query.search.toLowerCase();
        formatted = formatted.filter(t => t.topic_name.toLowerCase().includes(st) || t.slug.includes(st));
    }
    // Apply Sorting
    // classes, questions, recent, oldest
    if (query.sortBy === 'classes') {
        formatted.sort((a, b) => b.classCount - a.classCount);
    }
    else if (query.sortBy === 'questions') {
        formatted.sort((a, b) => b.questionCount - a.questionCount);
    }
    else if (query.sortBy === 'oldest') {
        // Sort by oldest class creation date
        formatted.sort((a, b) => a.latestClassDate.getTime() - b.latestClassDate.getTime());
    }
    else {
        // Default: recent - Sort by latest class creation date
        formatted.sort((a, b) => b.latestClassDate.getTime() - a.latestClassDate.getTime());
    }
    // Apply Pagination
    let page = Number(query.page) || 1;
    let limit = Number(query.limit) || 12;
    const totalCount = formatted.length;
    const totalPages = Math.ceil(totalCount / limit);
    if (page < 1)
        page = 1;
    const paginated = formatted.slice((page - 1) * limit, page * limit);
    return {
        topics: paginated,
        pagination: {
            page,
            limit,
            total: totalCount,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        }
    };
};
exports.getTopicsForBatchService = getTopicsForBatchService;
const updateTopicService = async ({ topicSlug, topic_name, photo, removePhoto, }) => {
    const existingTopic = await prisma_1.default.topic.findUnique({
        where: { slug: topicSlug },
    });
    if (!existingTopic) {
        throw new Error("Topic not found");
    }
    let newPhotoUrl = existingTopic.photo_url;
    let oldPhotoKey = null;
    // Handle photo removal
    if (removePhoto && existingTopic.photo_url) {
        // Extract key from URL
        const urlParts = existingTopic.photo_url.split('/');
        oldPhotoKey = urlParts[urlParts.length - 1];
        if (oldPhotoKey) {
            oldPhotoKey = `topics/${oldPhotoKey}`;
        }
        newPhotoUrl = null;
    }
    // Handle new photo upload
    if (photo) {
        try {
            const uploadResult = await s3_service_1.S3Service.uploadFile(photo, 'topics');
            newPhotoUrl = uploadResult.url;
            // If we had an old photo, mark its key for deletion
            if (existingTopic.photo_url) {
                const urlParts = existingTopic.photo_url.split('/');
                oldPhotoKey = `topics/${urlParts[urlParts.length - 1]}`;
            }
        }
        catch (error) {
            throw new Error("Failed to upload photo to S3");
        }
    }
    // Handle topic name update if provided
    let finalSlug = existingTopic.slug;
    if (topic_name) {
        const duplicate = await prisma_1.default.topic.findUnique({
            where: { topic_name },
        });
        if (duplicate && duplicate.id !== existingTopic.id) {
            throw new Error("Topic already exists");
        }
        const baseSlug = (0, slugify_1.default)(topic_name, {
            lower: true,
            strict: true,
        });
        finalSlug = baseSlug;
        let counter = 1;
        while (await prisma_1.default.topic.findFirst({
            where: {
                slug: finalSlug,
                NOT: { id: existingTopic.id },
            },
        })) {
            finalSlug = `${baseSlug}-${counter++}`;
        }
    }
    try {
        const updatedTopic = await prisma_1.default.topic.update({
            where: { id: existingTopic.id },
            data: {
                ...(topic_name && { topic_name }),
                slug: finalSlug,
                photo_url: newPhotoUrl,
            },
        });
        // Clean up old photo from S3 if update was successful
        if (oldPhotoKey) {
            try {
                await s3_service_1.S3Service.deleteFile(oldPhotoKey);
            }
            catch (cleanupError) {
                console.error("Failed to cleanup old photo from S3:", cleanupError);
            }
        }
        return updatedTopic;
    }
    catch (error) {
        // If database update fails, clean up newly uploaded photo
        if (photo && newPhotoUrl && newPhotoUrl !== existingTopic.photo_url) {
            const urlParts = newPhotoUrl.split('/');
            const newPhotoKey = `topics/${urlParts[urlParts.length - 1]}`;
            try {
                await s3_service_1.S3Service.deleteFile(newPhotoKey);
            }
            catch (cleanupError) {
                console.error("Failed to cleanup new photo after database error:", cleanupError);
            }
        }
        throw new Error("Failed to update topic");
    }
};
exports.updateTopicService = updateTopicService;
const deleteTopicService = async ({ topicSlug }) => {
    const topic = await prisma_1.default.topic.findUnique({
        where: { slug: topicSlug },
    });
    if (!topic) {
        throw new Error("Topic not found");
    }
    const classCount = await prisma_1.default.class.count({
        where: { topic_id: topic.id },
    });
    if (classCount > 0) {
        throw new Error("Cannot delete topic with existing classes");
    }
    const questionCount = await prisma_1.default.question.count({
        where: { topic_id: topic.id },
    });
    if (questionCount > 0) {
        throw new Error("Cannot delete topic with existing questions");
    }
    // Delete topic from database
    await prisma_1.default.topic.delete({
        where: { id: topic.id },
    });
    // Clean up photo from S3 if it exists
    if (topic.photo_url) {
        try {
            const urlParts = topic.photo_url.split('/');
            const photoKey = `topics/${urlParts[urlParts.length - 1]}`;
            await s3_service_1.S3Service.deleteFile(photoKey);
        }
        catch (cleanupError) {
            console.error("Failed to cleanup photo from S3 after topic deletion:", cleanupError);
        }
    }
    return true;
};
exports.deleteTopicService = deleteTopicService;
const getTopicsWithBatchProgressService = async ({ studentId, batchId, }) => {
    // Get all topics with batch-specific classes and question counts
    const topics = await prisma_1.default.topic.findMany({
        include: {
            classes: {
                where: {
                    batch_id: batchId
                },
                include: {
                    questionVisibility: {
                        include: {
                            question: {
                                select: {
                                    id: true,
                                    topic_id: true
                                }
                            }
                        }
                    }
                },
                orderBy: { created_at: 'asc' }
            }
        }
    });
    // Get all question IDs assigned to this batch
    const assignedQuestionIds = new Set();
    topics.forEach((topic) => {
        topic.classes.forEach((cls) => {
            cls.questionVisibility.forEach((qv) => {
                assignedQuestionIds.add(qv.question.id);
            });
        });
    });
    // Get student's solved questions for this batch only
    const studentProgress = await prisma_1.default.studentProgress.findMany({
        where: {
            student_id: studentId,
            question_id: { in: Array.from(assignedQuestionIds) }
        },
        include: {
            question: {
                select: {
                    topic_id: true
                }
            }
        }
    });
    // Group solved questions by topic
    const solvedByTopic = new Map();
    studentProgress.forEach(progress => {
        const topicId = progress.question.topic_id;
        if (!solvedByTopic.has(topicId)) {
            solvedByTopic.set(topicId, new Set());
        }
        solvedByTopic.get(topicId).add(progress.question_id);
    });
    // Format response
    const formattedTopics = topics.map((topic) => {
        // Count unique questions assigned to this batch for this topic
        const assignedQuestions = new Set();
        topic.classes.forEach((cls) => {
            cls.questionVisibility.forEach((qv) => {
                // Only count questions that belong to this topic
                if (qv.question.topic_id === topic.id) {
                    assignedQuestions.add(qv.question.id);
                }
            });
        });
        // Get solved questions for this topic
        const solvedQuestions = solvedByTopic.get(topic.id) || new Set();
        return {
            id: topic.id,
            topic_name: topic.topic_name,
            slug: topic.slug,
            photo_url: topic.photo_url,
            batchSpecificData: {
                totalClasses: topic.classes.length,
                totalQuestions: assignedQuestions.size,
                solvedQuestions: solvedQuestions.size
            }
        };
    });
    return formattedTopics;
};
exports.getTopicsWithBatchProgressService = getTopicsWithBatchProgressService;
const getTopicOverviewWithClassesSummaryService = async ({ studentId, batchId, topicSlug, }) => {
    // Get topic with batch-specific classes
    const topic = await prisma_1.default.topic.findFirst({
        where: { slug: topicSlug },
        include: {
            classes: {
                where: {
                    batch_id: batchId
                },
                include: {
                    questionVisibility: {
                        include: {
                            question: {
                                select: {
                                    id: true
                                }
                            }
                        }
                    }
                },
                orderBy: { created_at: 'asc' }
            }
        }
    });
    if (!topic) {
        throw new Error("Topic not found");
    }
    // Get all question IDs assigned to this batch for this topic
    const assignedQuestionIds = new Set();
    topic.classes.forEach((cls) => {
        cls.questionVisibility.forEach((qv) => {
            assignedQuestionIds.add(qv.question.id);
        });
    });
    // Get student's solved questions for this batch only
    const studentProgress = await prisma_1.default.studentProgress.findMany({
        where: {
            student_id: studentId,
            question_id: { in: Array.from(assignedQuestionIds) }
        },
        include: {
            question: {
                select: {
                    id: true
                }
            }
        }
    });
    // Create a Set of solved question IDs for quick lookup
    const solvedQuestionIds = new Set(studentProgress.map(progress => progress.question_id));
    // Format classes with summary data
    const classesSummary = topic.classes.map((cls) => {
        // Count total questions for this class
        const totalQuestions = cls.questionVisibility.length;
        // Count solved questions for this class
        const solvedQuestions = cls.questionVisibility.filter((qv) => solvedQuestionIds.has(qv.question.id)).length;
        return {
            id: cls.id,
            class_name: cls.class_name,
            slug: cls.slug,
            duration_minutes: cls.duration_minutes,
            description: cls.description,
            totalQuestions,
            solvedQuestions
        };
    });
    // Calculate overall topic progress
    const totalTopicQuestions = classesSummary.reduce((sum, cls) => sum + cls.totalQuestions, 0);
    const totalSolvedQuestions = classesSummary.reduce((sum, cls) => sum + cls.solvedQuestions, 0);
    return {
        id: topic.id,
        topic_name: topic.topic_name,
        slug: topic.slug,
        description: topic.description || null,
        photo_url: topic.photo_url || null,
        classes: classesSummary,
        overallProgress: {
            totalClasses: classesSummary.length,
            totalQuestions: totalTopicQuestions,
            solvedQuestions: totalSolvedQuestions
        }
    };
};
exports.getTopicOverviewWithClassesSummaryService = getTopicOverviewWithClassesSummaryService;
