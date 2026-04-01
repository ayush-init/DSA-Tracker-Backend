"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopicProgressByUsername = exports.getTopicOverviewWithClassesSummary = exports.getTopicsWithBatchProgress = exports.createTopicsBulk = exports.deleteTopic = exports.updateTopic = exports.getTopicsForBatch = exports.getAllTopics = exports.createTopic = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const topic_service_1 = require("../services/topic.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiError_1 = require("../utils/ApiError");
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
exports.createTopicsBulk = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { topics } = req.body;
    if (!topics || !Array.isArray(topics)) {
        throw new ApiError_1.ApiError(400, "Topics must be an array", [], "INVALID_INPUT");
    }
    // Slug generate helper
    const generateSlug = (name) => name.toLowerCase().trim().replace(/\s+/g, "-");
    const formattedTopics = topics.map((topic_name) => ({
        topic_name,
        slug: generateSlug(topic_name),
    }));
    const created = await prisma_1.default.topic.createMany({
        data: formattedTopics,
        skipDuplicates: true, // ignore duplicates
    });
    return res.status(201).json({
        message: "Topics uploaded successfully",
        count: created.count,
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
exports.getTopicProgressByUsername = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { username } = req.params;
    const { sortBy = 'solved' } = req.query;
    // Find the student by username
    const student = await prisma_1.default.student.findUnique({
        where: { username: username },
        include: {
            batch: true
        }
    });
    if (!student) {
        throw new ApiError_1.ApiError(404, "Student not found", [], "STUDENT_NOT_FOUND");
    }
    // Get student progress to calculate solved questions
    const studentProgress = await prisma_1.default.studentProgress.findMany({
        where: { student_id: student.id }
    });
    // Get all topics with their classes
    const topics = await prisma_1.default.topic.findMany({
        include: {
            classes: {
                where: {
                    batch_id: student.batch_id || undefined
                },
                include: {
                    questionVisibility: true
                }
            }
        }
    });
    // Calculate progress for each topic
    const topicProgress = topics.map((topic) => {
        let totalAssigned = 0;
        let totalSolved = 0;
        topic.classes.forEach((cls) => {
            cls.questionVisibility.forEach((qv) => {
                totalAssigned += 1;
                // Check if student solved this question
                const isSolved = studentProgress.some((sp) => sp.question_id === qv.question_id);
                if (isSolved) {
                    totalSolved += 1;
                }
            });
        });
        return {
            id: topic.id,
            topic_name: topic.topic_name,
            slug: topic.slug,
            photo_url: topic.photo_url,
            totalAssigned,
            totalSolved
        };
    });
    // Sort topics based on query parameter
    const sortedTopics = topicProgress.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.topic_name.localeCompare(b.topic_name);
            case 'assigned':
                return b.totalAssigned - a.totalAssigned;
            case 'solved':
            default:
                return b.totalSolved - a.totalSolved;
        }
    });
    return res.json({
        username,
        studentName: student.name,
        batchName: student.batch?.batch_name || 'Unknown',
        topics: sortedTopics,
        totalTopics: topics.length,
        totalAssigned: topicProgress.reduce((sum, topic) => sum + topic.totalAssigned, 0),
        totalSolved: topicProgress.reduce((sum, topic) => sum + topic.totalSolved, 0)
    });
});
