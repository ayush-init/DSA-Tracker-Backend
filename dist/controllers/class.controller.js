"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClassDetailsWithFullQuestions = exports.deleteClass = exports.updateClass = exports.getClassDetails = exports.createClassInTopic = exports.getClassesByTopic = void 0;
const class_service_1 = require("../services/class.service");
const getClassesByTopic = async (req, res) => {
    try {
        const batch = req.batch;
        const topicSlugParam = req.params.topicSlug;
        if (typeof topicSlugParam !== "string") {
            return res.status(400).json({
                error: "Invalid topic slug",
            });
        }
        const classes = await (0, class_service_1.getClassesByTopicService)({
            batchId: batch.id,
            topicSlug: topicSlugParam, // string
        });
        return res.json(classes);
    }
    catch (error) {
        return res.status(400).json({
            error: error.message,
        });
    }
};
exports.getClassesByTopic = getClassesByTopic;
const createClassInTopic = async (req, res) => {
    try {
        const batch = req.batch;
        const topicSlugParam = req.params.topicSlug;
        if (typeof topicSlugParam !== "string") {
            return res.status(400).json({
                error: "Invalid topic slug",
            });
        }
        const { class_name, description, pdf_url, duration_minutes, class_date, } = req.body;
        const newClass = await (0, class_service_1.createClassInTopicService)({
            batchId: batch.id,
            topicSlug: topicSlugParam,
            class_name,
            description,
            pdf_url,
            duration_minutes,
            class_date,
        });
        return res.status(201).json({
            message: "Class created successfully",
            class: newClass,
        });
    }
    catch (error) {
        return res.status(400).json({
            error: error.message,
        });
    }
};
exports.createClassInTopic = createClassInTopic;
const getClassDetails = async (req, res) => {
    try {
        const batch = req.batch;
        const topicSlugParam = req.params.topicSlug;
        const classSlugParam = req.params.classSlug;
        if (typeof topicSlugParam !== "string") {
            return res.status(400).json({
                error: "Invalid topic slug",
            });
        }
        if (typeof classSlugParam !== "string") {
            return res.status(400).json({
                error: "Invalid class slug",
            });
        }
        const classDetails = await (0, class_service_1.getClassDetailsService)({
            batchId: batch.id,
            topicSlug: topicSlugParam,
            classSlug: classSlugParam,
        });
        return res.json(classDetails);
    }
    catch (error) {
        return res.status(400).json({
            error: error.message,
        });
    }
};
exports.getClassDetails = getClassDetails;
const updateClass = async (req, res) => {
    try {
        const batch = req.batch;
        const topicSlugParam = req.params.topicSlug;
        const classSlug = req.params.classSlug;
        if (typeof topicSlugParam !== "string") {
            return res.status(400).json({
                error: "Invalid topic slug",
            });
        }
        if (typeof classSlug !== "string") {
            return res.status(400).json({
                error: "Invalid class slug",
            });
        }
        const updated = await (0, class_service_1.updateClassService)({
            batchId: batch.id,
            topicSlug: topicSlugParam,
            classSlug,
            ...req.body,
        });
        return res.json({
            message: "Class updated successfully",
            class: updated,
        });
    }
    catch (error) {
        return res.status(400).json({
            error: error.message,
        });
    }
};
exports.updateClass = updateClass;
const deleteClass = async (req, res) => {
    try {
        const batch = req.batch;
        const topicSlugParam = req.params.topicSlug;
        const classSlug = req.params.classSlug;
        if (typeof topicSlugParam !== "string") {
            return res.status(400).json({
                error: "Invalid topic slug",
            });
        }
        if (typeof classSlug !== "string") {
            return res.status(400).json({
                error: "Invalid class slug",
            });
        }
        await (0, class_service_1.deleteClassService)({
            batchId: batch.id,
            topicSlug: topicSlugParam,
            classSlug,
        });
        return res.json({
            message: "Class deleted successfully",
        });
    }
    catch (error) {
        return res.status(400).json({
            error: error.message,
        });
    }
};
exports.deleteClass = deleteClass;
// Student-specific controller - get class details with full questions array
const getClassDetailsWithFullQuestions = async (req, res) => {
    try {
        // Get student info from middleware (extractStudentInfo)
        const student = req.student;
        const batchId = req.batchId;
        const { topicSlug, classSlug } = req.params;
        const studentId = student?.id;
        // Ensure slugs are strings (not string arrays)
        const topic = Array.isArray(topicSlug) ? topicSlug[0] : topicSlug;
        const cls = Array.isArray(classSlug) ? classSlug[0] : classSlug;
        if (!studentId || !batchId || !topic || !cls) {
            return res.status(400).json({
                error: "Student authentication and topic/class slugs required",
            });
        }
        const classDetails = await (0, class_service_1.getClassDetailsWithFullQuestionsService)({
            studentId,
            batchId,
            topicSlug: topic,
            classSlug: cls,
        });
        return res.json(classDetails);
    }
    catch (error) {
        return res.status(500).json({
            error: error.message || "Failed to fetch class details",
        });
    }
};
exports.getClassDetailsWithFullQuestions = getClassDetailsWithFullQuestions;
