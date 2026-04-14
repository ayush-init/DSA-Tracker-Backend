  import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware";
import { isAdmin, isTeacherOrAbove } from "../middlewares/role.middleware";
import { extractAdminInfo } from "../middlewares/admin.middleware";
import { resolveBatch } from "../middlewares/batch.middleware";
import { heavyLimiter, apiLimiter } from "../middlewares/rateLimiter";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.middleware";
import {
  createStudentSchema,
  updateStudentSchema,
  studentIdParamSchema,
  studentQuerySchema,
} from "../schemas/student.schema";
import {
  createQuestionSchema,
  updateQuestionSchema,
  questionIdParamSchema,
  questionQuerySchema,
} from "../schemas/question.schema";
import {
  createTopicSchema,
  updateTopicSchema,
  createClassSchema,
  updateClassSchema,
  topicSlugParamSchema,
  classIdParamSchema,
  classSlugParamSchema,
} from "../schemas/topic.schema";
import { batchStatsSchema } from "../schemas/admin.schema";
import { getAllCities } from "../controllers/city.controller";
import { getAllBatches } from "../controllers/batch.controller";
import { createTopic, deleteTopic, getAllTopics, getTopicsForBatch, updateTopic, createTopicsBulk, bulkTestUploadQuestions } from "../controllers/topic.controller";
import { createQuestion, deleteQuestion, getAllQuestions, getAssignedQuestionsController, updateQuestion, bulkUploadQuestions } from "../controllers/question.controller";
import { uploadImage } from "../middlewares/imageUpload.middleware";
import { upload } from "../middlewares/upload.middleware";
import { uploadPdf } from "../middlewares/pdfUpload.middleware";
import { getAdminStats, getRolesController, getCurrentAdminController } from "../controllers/admin.controller";
import { downloadBatchReportController } from "../controllers/csv.controller";
import { getAdminLeaderboard } from "../controllers/leaderboard.controller";
import { assignQuestionsToClass, getAssignedQuestionsOfClass, removeQuestionFromClass, updateQuestionVisibilityType } from "../controllers/questionVisibility.controller";
import { createClassInTopic, deleteClass, getClassDetails, getClassesByTopic, updateClass } from "../controllers/class.controller";
import { manualSync } from "../controllers/progress.controller";
import { addStudentProgressController, createStudentController, deleteStudentDetails, getAllStudentsController, getStudentReportController, updateStudentDetails } from "../controllers/student.controller";
import { bulkStudentUploadController } from "../controllers/bulk.controller";

const router = Router();

router.use(verifyToken);
router.use(isAdmin);
router.use(extractAdminInfo);  // Add admin info extraction

// Current Admin Info
router.get("/me", getCurrentAdminController);

// Cities
router.get("/cities", getAllCities);

// Batches
router.get("/batches", getAllBatches);

// Global Topics
router.get("/topics", getAllTopics);
router.post("/topics", isTeacherOrAbove, uploadImage.single('photo'), validateBody(createTopicSchema), createTopic);
router.put("/topics/:topicSlug", isTeacherOrAbove, uploadImage.single('photo'), validateParams(topicSlugParamSchema), validateBody(updateTopicSchema), updateTopic);
router.patch("/topics/:topicSlug", isTeacherOrAbove, uploadImage.single('photo'), validateParams(topicSlugParamSchema), validateBody(updateTopicSchema), updateTopic);
router.delete("/topics/:topicSlug", isTeacherOrAbove, validateParams(topicSlugParamSchema), deleteTopic);

// Bulk Operation for Topics
router.post("/topics/bulk-upload", isTeacherOrAbove, createTopicsBulk);

// Bulk Test Upload Questions contain topic slug
router.post("/bulkTestUpload", isTeacherOrAbove, upload.single("file"), bulkTestUploadQuestions);

// questions gloabal 
router.post("/questions", isTeacherOrAbove, validateBody(createQuestionSchema), createQuestion);

router.get("/questions", validateQuery(questionQuerySchema), getAllQuestions);

router.patch(
  "/questions/:id",
  isTeacherOrAbove,
  validateParams(questionIdParamSchema),
  validateBody(updateQuestionSchema),
  updateQuestion
);
router.delete(
  "/questions/:id",
  isTeacherOrAbove,
  validateParams(questionIdParamSchema),
  deleteQuestion
);

// Bulk Operation for Question 
router.post(
  "/questions/bulk-upload",isAdmin,
  isTeacherOrAbove,
  upload.single("file"),
  bulkUploadQuestions
);

// Download Batch Report
router.post("/student/reportdownload", downloadBatchReportController);

// Bulk Operation for Student 
router.post(
  "/bulk-operations",
  upload.single("file"),
  bulkStudentUploadController
);

// Admin Statistics
router.post("/stats", validateBody(batchStatsSchema), getAdminStats);

// Roles
router.get("/roles", getRolesController);

router.post("/leaderboard", heavyLimiter, getAdminLeaderboard); // Single admin leaderboard with pagination and search

router.patch("/students/:id", isTeacherOrAbove, isAdmin, validateParams(studentIdParamSchema), validateBody(updateStudentSchema), updateStudentDetails);

// Delete (Hard Delete)
router.delete("/students/:id", isTeacherOrAbove, isAdmin, validateParams(studentIdParamSchema), deleteStudentDetails);

router.get("/students", validateQuery(studentQuerySchema), getAllStudentsController);
// router.get("/students/:username", getStudentReportController);
router.post("/students", isAdmin, isTeacherOrAbove, validateBody(createStudentSchema), createStudentController);

router.post("/students/progress", isTeacherOrAbove, isAdmin, addStudentProgressController);

router.post("/students/sync/:id", manualSync);

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
  uploadPdf,
  validateParams(topicSlugParamSchema),
  validateBody(createClassSchema),
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
  uploadPdf,
  validateParams(classSlugParamSchema),
  validateBody(updateClassSchema),
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
  validateParams(classSlugParamSchema),
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

// Update question visibility type (homework/classwork)
router.patch(
  "/:batchSlug/topics/:topicSlug/classes/:classSlug/visibility/:visibilityId",
  isTeacherOrAbove,
  updateQuestionVisibilityType
);

export default router;