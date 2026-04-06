"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkTestUploadQuestions = exports.getPaginatedTopics = exports.getTopicProgressByUsername = exports.createTopicsBulk = exports.getTopicOverviewWithClassesSummary = exports.getTopicsWithBatchProgress = exports.deleteTopic = exports.updateTopic = exports.getTopicsForBatch = exports.getAllTopics = exports.createTopic = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const topic_service_1 = require("../services/topic.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiError_1 = require("../utils/ApiError");
const slugify_1 = require("../utils/slugify");
const question_service_1 = require("../services/question.service");
exports.createTopic = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    console.log("Create Topic req.body:", req.body);
    const topic_name = req.body?.topic_name;
    const photo = req.file;
    if (!topic_name) {
        throw new ApiError_1.ApiError(400, "Topic name required", [], "REQUIRED_FIELD");
    }
    const topic = await (0, topic_service_1.createTopicService)({ topic_name, photo });
    return res.status(201).json({
        message: "Topic created successfully",
        topic,
    });
});
// Get All Topics
exports.getAllTopics = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const topics = await (0, topic_service_1.getAllTopicsService)();
    return res.json(topics);
});
exports.getTopicsForBatch = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const batch = req.batch;
    const data = await (0, topic_service_1.getTopicsForBatchService)({
        batchId: batch.id,
        query: req.query
    });
    return res.json(data);
});
exports.updateTopic = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    console.log("Update Topic req.body:", req.body);
    const topicSlug = req.params.topicSlug;
    const topic_name = req.body?.topic_name;
    const removePhoto = req.body?.removePhoto;
    const photo = req.file;
    if (!topic_name) {
        throw new ApiError_1.ApiError(400, "Topic name required", [], "REQUIRED_FIELD");
    }
    const topic = await (0, topic_service_1.updateTopicService)({
        topicSlug,
        topic_name,
        photo,
        removePhoto: removePhoto === 'true' || removePhoto === true,
    });
    return res.json({
        message: "Topic updated successfully",
        topic,
    });
});
exports.deleteTopic = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const topicSlug = req.params.topicSlug;
    await (0, topic_service_1.deleteTopicService)({
        topicSlug,
    });
    return res.json({
        message: "Topic deleted successfully",
    });
});
// Student-specific controller - get topics with batch progress
exports.getTopicsWithBatchProgress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    // Get student info from middleware (extractStudentInfo)
    const student = req.student;
    const batchId = req.batchId;
    const studentId = student?.id;
    if (!studentId || !batchId) {
        throw new ApiError_1.ApiError(401, "Student authentication required", [], "UNAUTHORIZED");
    }
    const topics = await (0, topic_service_1.getTopicsWithBatchProgressService)({
        studentId,
        batchId,
        query: req.query,
    });
    return res.json(topics);
});
// Student-specific controller - get topic overview with classes summary
exports.getTopicOverviewWithClassesSummary = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    // Get student info from middleware (extractStudentInfo)
    const student = req.student;
    const batchId = req.batchId;
    const { topicSlug } = req.params;
    const studentId = student?.id;
    // Ensure topicSlug is a string (not string array)
    const slug = Array.isArray(topicSlug) ? topicSlug[0] : topicSlug;
    if (!studentId || !batchId || !slug) {
        throw new ApiError_1.ApiError(400, "Student authentication and topic slug required", [], "REQUIRED_FIELD");
    }
    const topicOverview = await (0, topic_service_1.getTopicOverviewWithClassesSummaryService)({
        studentId,
        batchId,
        topicSlug: slug,
        query: req.query,
    });
    return res.json(topicOverview);
});
exports.createTopicsBulk = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { topics } = req.body;
    if (!topics || !Array.isArray(topics)) {
        throw new ApiError_1.ApiError(400, "Topics array is required", [], "REQUIRED_FIELD");
    }
    // Format topics with slugs - handle both string and object formats
    const formattedTopics = topics.map((topic) => {
        const topicName = typeof topic === 'string' ? topic : topic.topic_name;
        if (!topicName) {
            throw new ApiError_1.ApiError(400, "Each topic must have a topic_name", [], "REQUIRED_FIELD");
        }
        return {
            topic_name: topicName,
            slug: (0, slugify_1.generateSlug)(topicName),
        };
    });
    const created = await (0, topic_service_1.createTopicsBulkService)(formattedTopics);
    return res.status(201).json({
        message: "Topics created successfully",
        created: created,
    });
});
// Update the getTopicProgressByUsername function:
exports.getTopicProgressByUsername = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { username } = req.params;
    const { sortBy = 'solved' } = req.query;
    // ✅ Add validation and type assertion
    if (!username || Array.isArray(username)) {
        throw new ApiError_1.ApiError(400, "Valid username is required", [], "REQUIRED_FIELD");
    }
    const result = await (0, topic_service_1.getTopicProgressByUsernameService)(username);
    // Sort topics based on sortBy parameter
    let sortedTopics = result.topics;
    if (sortBy === 'solved') {
        sortedTopics.sort((a, b) => b.solvedQuestions - a.solvedQuestions);
    }
    else if (sortBy === 'progress') {
        sortedTopics.sort((a, b) => b.progressPercentage - a.progressPercentage);
    }
    return res.status(200).json({
        success: true,
        student: result.student,
        topics: sortedTopics,
    });
});
// Get paginated topics for dropdown
exports.getPaginatedTopics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const search = req.query.search || '';
    const result = await (0, topic_service_1.getPaginatedTopicsService)({ page, limit, search });
    return res.json(result);
});
exports.bulkTestUploadQuestions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const file = req.file;
    if (!file) {
        throw new ApiError_1.ApiError(400, "CSV file is required", [], "REQUIRED_FIELD");
    }
    // Parse CSV file
    const csv = require('csv-parser');
    const results = [];
    await new Promise((resolve, reject) => {
        const stream = require('stream');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(file.buffer);
        bufferStream
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', resolve)
            .on('error', reject);
    });
    if (results.length === 0) {
        throw new ApiError_1.ApiError(400, "CSV file is empty or invalid", [], "INVALID_FILE");
    }
    // Validate required columns
    const requiredColumns = ['question_name', 'question_link', 'level', 'type', 'topic_slug'];
    const csvColumns = Object.keys(results[0]);
    const missingColumns = requiredColumns.filter(col => !csvColumns.includes(col));
    if (missingColumns.length > 0) {
        throw new ApiError_1.ApiError(400, `Missing required columns: ${missingColumns.join(', ')}`, [], "MISSING_COLUMNS");
    }
    // Validate and format each question
    const validatedQuestions = results.map((row, index) => {
        const { question_name, question_link, level, type, topic_slug } = row;
        if (!question_name || !question_name.trim()) {
            throw new ApiError_1.ApiError(400, `Row ${index + 2}: question_name is required`, [], "REQUIRED_FIELD");
        }
        if (!question_link || !question_link.trim()) {
            throw new ApiError_1.ApiError(400, `Row ${index + 2}: question_link is required`, [], "REQUIRED_FIELD");
        }
        if (!level || !['EASY', 'MEDIUM', 'HARD'].includes(level.toUpperCase().trim())) {
            throw new ApiError_1.ApiError(400, `Row ${index + 2}: level must be EASY, MEDIUM, or HARD`, [], "INVALID_VALUE");
        }
        if (!type || !['HOMEWORK', 'CLASSWORK'].includes(type.toUpperCase().trim())) {
            throw new ApiError_1.ApiError(400, `Row ${index + 2}: type must be HOMEWORK or CLASSWORK`, [], "INVALID_VALUE");
        }
        if (!topic_slug || !topic_slug.trim()) {
            throw new ApiError_1.ApiError(400, `Row ${index + 2}: topic_slug is required`, [], "REQUIRED_FIELD");
        }
        return {
            question_name: question_name.trim(),
            question_link: question_link.trim(),
            level: level.toUpperCase().trim(),
            type: type.toUpperCase().trim(),
            topic_slug: topic_slug.trim(),
        };
    });
    // Find topic IDs for the given slugs
    const topicSlugs = [...new Set(validatedQuestions.map(q => q.topic_slug))];
    const topics = await prisma_1.default.topic.findMany({
        where: { slug: { in: topicSlugs } },
        select: { id: true, slug: true }
    });
    const topicMap = new Map(topics.map(t => [t.slug, t.id]));
    // Check if all topic slugs exist
    const missingSlugs = topicSlugs.filter(slug => !topicMap.has(slug));
    if (missingSlugs.length > 0) {
        throw new ApiError_1.ApiError(400, `Invalid topic slugs: ${missingSlugs.join(', ')}`, [], "INVALID_TOPIC");
    }
    // Create questions with topic IDs and detected platform
    const questionsData = validatedQuestions.map(q => ({
        question_name: q.question_name,
        question_link: q.question_link,
        level: q.level,
        type: q.type,
        topic_id: topicMap.get(q.topic_slug), // We know this exists after validation
        platform: (0, question_service_1.detectPlatform)(q.question_link), // Detect platform from question link
    }));
    const created = await prisma_1.default.question.createMany({
        data: questionsData,
        skipDuplicates: true,
    });
    return res.status(201).json({
        message: "Questions created successfully",
        created: created,
        total: questionsData.length,
        processed: results.length,
    });
});
