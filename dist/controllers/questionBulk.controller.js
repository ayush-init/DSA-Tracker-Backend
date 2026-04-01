"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUploadQuestions = void 0;
const questionBulk_service_1 = require("../services/questionBulk.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiError_1 = require("../utils/ApiError");
exports.bulkUploadQuestions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        if (!req.file) {
            throw new ApiError_1.ApiError(400, "CSV file is required");
        }
        const { topic_id } = req.body;
        if (!topic_id) {
            throw new ApiError_1.ApiError(400, "Topic ID is required");
        }
        const result = await (0, questionBulk_service_1.bulkUploadQuestionsService)(req.file.buffer, Number(topic_id));
        return res.json({
            message: "Bulk upload successful",
            ...result,
        });
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        throw new ApiError_1.ApiError(400, error.message);
    }
});
