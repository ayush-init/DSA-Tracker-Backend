"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUploadQuestions = void 0;
const questionBulk_service_1 = require("../services/questionBulk.service");
const bulkUploadQuestions = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: "CSV file is required",
            });
        }
        const { topicId } = req.body;
        if (!topicId) {
            return res.status(400).json({
                error: "Topic ID is required",
            });
        }
        const result = await (0, questionBulk_service_1.bulkUploadQuestionsService)(req.file.buffer, Number(topicId));
        return res.json({
            message: "Bulk upload successful",
            ...result,
        });
    }
    catch (error) {
        return res.status(400).json({
            error: error.message,
        });
    }
};
exports.bulkUploadQuestions = bulkUploadQuestions;
