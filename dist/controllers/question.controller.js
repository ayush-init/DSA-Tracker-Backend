"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssignedQuestionsController = exports.deleteQuestion = exports.updateQuestion = exports.getAllQuestions = exports.createQuestion = void 0;
const question_service_1 = require("../services/question.service");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.createQuestion = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const question = await (0, question_service_1.createQuestionService)(req.body);
    return res.status(201).json({
        message: "Question created successfully",
        question,
    });
});
exports.getAllQuestions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { topicSlug, level, platform, type, search, page, limit, } = req.query;
    const result = await (0, question_service_1.getAllQuestionsService)({
        topicSlug: topicSlug,
        level: level,
        platform: platform,
        type: type,
        search: search,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
    });
    return res.json(result);
});
exports.updateQuestion = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const updated = await (0, question_service_1.updateQuestionService)({
        id: Number(id),
        ...req.body,
    });
    return res.json({
        message: "Question updated successfully",
        question: updated,
    });
});
exports.deleteQuestion = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    await (0, question_service_1.deleteQuestionService)({
        id: Number(id),
    });
    return res.json({
        message: "Question deleted successfully",
    });
});
exports.getAssignedQuestionsController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = await (0, question_service_1.getAssignedQuestionsService)(req.query);
    return res.status(200).json({
        success: true,
        data
    });
});
