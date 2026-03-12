"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const admin_middleware_1 = require("../middlewares/admin.middleware");
const batch_middleware_1 = require("../middlewares/batch.middleware");
const city_controller_1 = require("../controllers/city.controller");
const batch_controller_1 = require("../controllers/batch.controller");
const topic_controller_1 = require("../controllers/topic.controller");
const question_controller_1 = require("../controllers/question.controller");
const questionBulk_controller_1 = require("../controllers/questionBulk.controller");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const admin_controller_1 = require("../controllers/admin.controller");
const leaderboard_controller_1 = require("../controllers/leaderboard.controller");
const questionVisibility_controller_1 = require("../controllers/questionVisibility.controller");
const class_controller_1 = require("../controllers/class.controller");
const progress_controller_1 = require("../controllers/progress.controller");
const student_controller_1 = require("../controllers/student.controller");
const bulk_controller_1 = require("../controllers/bulk.controller");
// import {
//   getStudentsForBatch,
//   getStudentReport,
// } from "../controllers/admin/student.controller";
const router = (0, express_1.Router)();
/* ==========================================
    GLOBAL PROTECTION
========================================== */
router.use(auth_middleware_1.verifyToken);
router.use(role_middleware_1.isAdmin);
router.use(admin_middleware_1.extractAdminInfo); // Add admin info extraction
/* ==========================================
   GLOBAL ROUTES (NO BATCH CONTEXT)
========================================== */
// Cities
router.get("/cities", city_controller_1.getAllCities);
// Batches
router.post("/batches", batch_controller_1.createBatch);
router.get("/batches", batch_controller_1.getAllBatches);
// Admin Management
router.post("/admins", admin_controller_1.createAdminController);
router.get("/admins", admin_controller_1.getAllAdminsController);
// Global Topics
router.get("/topics", topic_controller_1.getAllTopics);
router.post("/topics", role_middleware_1.isTeacherOrAbove, topic_controller_1.createTopic);
router.patch("/topics/:id", role_middleware_1.isTeacherOrAbove, topic_controller_1.updateTopic);
router.delete("/topics/:id", role_middleware_1.isTeacherOrAbove, topic_controller_1.deleteTopic);
//  WORKSPACE ROUTES (BATCH CONTEXT)
// questions gloabal 
router.post("/questions", role_middleware_1.isTeacherOrAbove, question_controller_1.createQuestion);
router.get("/questions", question_controller_1.getAllQuestions);
router.patch("/questions/:id", role_middleware_1.isTeacherOrAbove, question_controller_1.updateQuestion);
router.delete("/questions/:id", role_middleware_1.isTeacherOrAbove, question_controller_1.deleteQuestion);
router.post("/questions/bulk-upload", role_middleware_1.isTeacherOrAbove, upload_middleware_1.upload.single("file"), questionBulk_controller_1.bulkUploadQuestions);
/* ---------- Students ---------- */
// Student CRUD
// Update
router.get("/dashboard", dashboard_controller_1.getDashboardController);
// Admin Statistics
router.post("/stats", admin_controller_1.getAdminStats);
// Leaderboard
router.post("/leaderboard", auth_middleware_1.verifyToken, role_middleware_1.isAdmin, leaderboard_controller_1.getAdminLeaderboard); // Single admin leaderboard with pagination and search
router.get("/assignedquestions", question_controller_1.getAssignedQuestionsController);
router.patch("/students/:id", role_middleware_1.isTeacherOrAbove, role_middleware_1.isAdmin, student_controller_1.updateStudentDetails);
// Delete (Hard Delete)
router.delete("/students/:id", role_middleware_1.isTeacherOrAbove, role_middleware_1.isAdmin, student_controller_1.deleteStudentDetails);
router.get("/students", student_controller_1.getAllStudentsController);
router.get("/students/:username", student_controller_1.getStudentReportController);
router.post("/students", role_middleware_1.isTeacherOrAbove, student_controller_1.createStudentController);
router.post("/students/progress", role_middleware_1.isTeacherOrAbove, role_middleware_1.isAdmin, student_controller_1.addStudentProgressController);
// router.get("/test/leetcode/:username", testLeetcode);
// router.get("/test/gfg/:username", testGfg);
router.post("/students/sync/:id", progress_controller_1.manualSync);
router.post("/bulk-operations", upload_middleware_1.upload.single("file"), bulk_controller_1.bulkStudentUploadController);
// Everything below requires valid batchSlug
router.use("/:batchSlug", batch_middleware_1.resolveBatch);
router.get("/:batchSlug/topics", topic_controller_1.getTopicsForBatch);
/* ---------- Classes (Topic Driven) ---------- */
// List classes of a topic
router.get("/:batchSlug/topics/:topicSlug/classes", class_controller_1.getClassesByTopic);
// Create class under topic
router.post("/:batchSlug/topics/:topicSlug/classes", role_middleware_1.isTeacherOrAbove, class_controller_1.createClassInTopic);
// Get single class (topic context required)
router.get("/:batchSlug/topics/:topicSlug/classes/:classSlug", class_controller_1.getClassDetails);
router.patch("/:batchSlug/topics/:topicSlug/classes/:classSlug", role_middleware_1.isTeacherOrAbove, class_controller_1.updateClass);
router.delete("/:batchSlug/topics/:topicSlug/classes/:classSlug", role_middleware_1.isTeacherOrAbove, class_controller_1.deleteClass);
// Question assignment routes (topic context required)
router.post("/:batchSlug/topics/:topicSlug/classes/:classSlug/questions", role_middleware_1.isTeacherOrAbove, questionVisibility_controller_1.assignQuestionsToClass);
router.get("/:batchSlug/topics/:topicSlug/classes/:classSlug/questions", questionVisibility_controller_1.getAssignedQuestionsOfClass);
router.delete("/:batchSlug/topics/:topicSlug/classes/:classSlug/questions/:questionId", role_middleware_1.isTeacherOrAbove, questionVisibility_controller_1.removeQuestionFromClass);
exports.default = router;
