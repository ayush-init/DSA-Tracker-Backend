import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware";
import { isAdmin, isTeacherOrAbove } from "../middlewares/role.middleware";
import { extractAdminInfo } from "../middlewares/admin.middleware";
import { resolveBatch } from "../middlewares/batch.middleware";
import { getAllCities } from "../controllers/city.controller";
import { createBatch, getAllBatches } from "../controllers/batch.controller";
import { createTopic, deleteTopic, getAllTopics, getTopicsForBatch, updateTopic } from "../controllers/topic.controller";
import { createQuestion, deleteQuestion, getAllQuestions, getAssignedQuestionsController, updateQuestion } from "../controllers/question.controller";
import { bulkUploadQuestions } from "../controllers/questionBulk.controller";
import { upload } from "../middlewares/upload.middleware";
import { getDashboardController } from "../controllers/dashboard.controller";
import { createAdminController, getAdminStats, getAllAdminsController } from "../controllers/admin.controller";
import { getAdminLeaderboard } from "../controllers/leaderboard.controller";
import prisma from "../config/prisma";
import { assignQuestionsToClass, getAssignedQuestionsOfClass, removeQuestionFromClass } from "../controllers/questionVisibility.controller";
import { createClassInTopic, deleteClass, getClassDetails, getClassesByTopic, updateClass } from "../controllers/class.controller";
import { manualSync } from "../controllers/progress.controller";
import { testGfg, testLeetcode } from "../controllers/test.controller";
import { addStudentProgressController, createStudentController, deleteStudentDetails, getAllStudentsController, getStudentReportController, updateStudentDetails } from "../controllers/student.controller";
import { bulkStudentUploadController } from "../controllers/bulk.controller";


// import {
//   getStudentsForBatch,
//   getStudentReport,
// } from "../controllers/admin/student.controller";

const router = Router();

/* ==========================================
    GLOBAL PROTECTION
========================================== */

router.use(verifyToken);
router.use(isAdmin);
router.use(extractAdminInfo);  // Add admin info extraction

/* ==========================================
   GLOBAL ROUTES (NO BATCH CONTEXT)
========================================== */

// Cities
router.get("/cities", getAllCities);

// Batches
router.post("/batches", createBatch);
router.get("/batches", getAllBatches);

// Admin Management
router.post("/admins", createAdminController);
router.get("/admins", getAllAdminsController);

// Global Topics
router.get("/topics", getAllTopics);
router.post("/topics", isTeacherOrAbove, createTopic);
router.patch("/topics/:id", isTeacherOrAbove, updateTopic);
router.delete("/topics/:id", isTeacherOrAbove, deleteTopic);

//  WORKSPACE ROUTES (BATCH CONTEXT)
// questions gloabal 
router.post("/questions", isTeacherOrAbove, createQuestion);

router.get("/questions", getAllQuestions);
router.patch(
  "/questions/:id",
  isTeacherOrAbove,
  updateQuestion
);
router.delete(
  "/questions/:id",
  isTeacherOrAbove,
  deleteQuestion
);
router.post(
  "/questions/bulk-upload",
  isTeacherOrAbove,
  upload.single("file"),
  bulkUploadQuestions
);

/* ---------- Students ---------- */

// Student CRUD
// Update

router.get("/dashboard", getDashboardController);

// Admin Statistics
router.post("/stats", getAdminStats);

// Leaderboard
router.post("/leaderboard", verifyToken, isAdmin, getAdminLeaderboard); // Single admin leaderboard with pagination and search





router.get("/assignedquestions", getAssignedQuestionsController);

router.patch("/students/:id", isTeacherOrAbove, isAdmin, updateStudentDetails);

// Delete (Hard Delete)
router.delete("/students/:id", isTeacherOrAbove, isAdmin, deleteStudentDetails);

router.get("/students", getAllStudentsController);
router.get("/students/:username", getStudentReportController);
router.post("/students", isTeacherOrAbove, createStudentController);

router.post("/students/progress", isTeacherOrAbove, isAdmin, addStudentProgressController);
// router.get("/test/leetcode/:username", testLeetcode);
// router.get("/test/gfg/:username", testGfg);
router.post("/students/sync/:id", manualSync);

router.post(
  "/bulk-operations",
  upload.single("file"),
  bulkStudentUploadController
);

// Everything below requires valid batchSlug
router.use("/:batchSlug", resolveBatch);

router.get("/:batchSlug/topics", getTopicsForBatch);

/* ---------- Classes (Topic Driven) ---------- */

// List classes of a topic
router.get(
  "/:batchSlug/topics/:topicSlug/classes",
  getClassesByTopic
);
// Create class under topic
router.post(
  "/:batchSlug/topics/:topicSlug/classes",
  isTeacherOrAbove,
  createClassInTopic
);

// Get single class (topic context required)
router.get(
  "/:batchSlug/topics/:topicSlug/classes/:classSlug",
  getClassDetails
);

router.patch(
  "/:batchSlug/topics/:topicSlug/classes/:classSlug",
  isTeacherOrAbove,
  updateClass

);

router.delete(
  "/:batchSlug/topics/:topicSlug/classes/:classSlug",
  isTeacherOrAbove,
  deleteClass
);

// Question assignment routes (topic context required)
router.post(
  "/:batchSlug/topics/:topicSlug/classes/:classSlug/questions",
  isTeacherOrAbove,
  assignQuestionsToClass
);

router.get(
  "/:batchSlug/topics/:topicSlug/classes/:classSlug/questions",
  getAssignedQuestionsOfClass
);

router.delete(
  "/:batchSlug/topics/:topicSlug/classes/:classSlug/questions/:questionId",
  isTeacherOrAbove,
  removeQuestionFromClass
);


export default router;