"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentQuestions = void 0;
const recentQuestions_service_1 = require("../services/recentQuestions.service");
const getRecentQuestions = async (req, res) => {
    try {
        // Get batch info from middleware (extractStudentInfo)
        const batchId = req.batchId;
        const { days } = req.query;
        if (!batchId) {
            return res.status(400).json({
                error: "Student authentication required",
            });
        }
        // Parse days parameter (default to 7)
        const daysParam = days ? parseInt(days) : 7;
        if (isNaN(daysParam) || daysParam < 1 || daysParam > 30) {
            return res.status(400).json({
                error: "Days parameter must be a number between 1 and 30",
            });
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
        return res.status(500).json({
            error: error.message || "Failed to fetch recent questions",
        });
    }
};
exports.getRecentQuestions = getRecentQuestions;
