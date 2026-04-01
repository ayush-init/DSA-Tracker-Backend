"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentQuestions = void 0;
const recentQuestions_service_1 = require("../services/recentQuestions.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiError_1 = require("../utils/ApiError");
exports.getRecentQuestions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        // Get batch info from middleware (extractStudentInfo)
        const batchId = req.batchId;
        const { days } = req.query;
        if (!batchId) {
            throw new ApiError_1.ApiError(401, "Student authentication required", [], "UNAUTHORIZED");
        }
        // Parse days parameter (default to 7)
        const daysParam = days ? parseInt(days) : 7;
        if (isNaN(daysParam) || daysParam < 1 || daysParam > 30) {
            throw new ApiError_1.ApiError(400, "Days parameter must be a number between 1 and 30", [], "INVALID_INPUT");
        }
        const questions = await (0, recentQuestions_service_1.getRecentQuestionsService)({
            batchId,
            days: daysParam
        });
        return res.json({
            questions,
            total: questions.length
        });
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        throw new ApiError_1.ApiError(500, error.message || "Failed to fetch recent questions", [], "INTERNAL_SERVER_ERROR");
    }
});
