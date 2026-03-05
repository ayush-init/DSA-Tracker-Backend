import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware";
import { isAdmin, isTeacherOrAbove } from "../middlewares/role.middleware";
import { resolveBatch } from "../middlewares/batch.middleware";

// Global Controllers
import { getAllCities } from "../controllers/admin/city.controller";
import { getAllTopics, createTopic, updateTopic, deleteTopic } from "../controllers/admin/topic.controller";
import { createBatch, getAllBatches } from "../controllers/admin/batch.controller";
import { createTopicsBulk }  from "../controllers/admin/topic.controller"
// Workspace Controllers (inside same files)
// import { getWorkspaceOverview, getBatchAnalytics, getLeaderboard } from "../controllers/admin/analytics.controller";

import { getTopicsForBatch } from "../controllers/admin/topic.controller";

import {
  createClassInTopic,
  getClassesByTopic,
  getClassDetails,
  updateClass,
  deleteClass,
} from "../controllers/admin/class.controller";

import {  createQuestion, deleteQuestion, getAllQuestions,  updateQuestion } from "../controllers/admin/question.controller";
import { assignQuestionsToClass, getAssignedQuestionsOfClass, removeQuestionFromClass } from "../controllers/admin/questionVisibility.controller";
import { upload } from "../middlewares/upload.middleware";
import { bulkUploadQuestions } from "../controllers/admin/questionBulk.controller";
import { updateStudentDetails, deleteStudentDetails }  from "../controllers/admin/student.controller"
import { getAllStudentsController, getStudentReportController, addStudentProgressController, createStudentController }  from "../controllers/admin/student.controller"
import { testLeetcode, testGfg } from "../controllers/test.controller";
import { manualSync } from "../controllers/admin/progress.controller";
import { getDashboardController } from "../controllers/admin/dashboard.controller";
import { getAssignedQuestionsController } from "../controllers/admin/question.controller";
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

/* ==========================================
   GLOBAL ROUTES (NO BATCH CONTEXT)
========================================== */

// Cities
router.get("/cities", getAllCities);

// Batches
router.post("/batches", createBatch);
router.get("/batches", getAllBatches);

// Global Topics
router.get("/topics", getAllTopics);
router.post("/topics", isTeacherOrAbove, createTopic);
router.patch("/topics/:id", isTeacherOrAbove, updateTopic);
router.delete("/topics/:id", isTeacherOrAbove, deleteTopic);
router.post(  "/topics/bulk",  isTeacherOrAbove,  createTopicsBulk);

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

// router.get("/students", getStudentsForBatch);
// + count of solved + streak + + all filters city wise + batch wise
// router.get("students/:username", getStudentReport);
// total solved  + hard + easy + medium + + topic wise how much +


// Student CRUD
// Update

router.get("/dashboard", getDashboardController);

router.get("/questions", getAssignedQuestionsController);

router.patch(  "/students/:id",isTeacherOrAbove,isAdmin,updateStudentDetails);

// Delete (Hard Delete)
router.delete( "/students/:id",isTeacherOrAbove,isAdmin,deleteStudentDetails);

router.get("/students", getAllStudentsController);
router.get("/students/:username", getStudentReportController);
router.post("/students", isTeacherOrAbove,createStudentController);

router.post( "/students/progress", isTeacherOrAbove, isAdmin, addStudentProgressController);


router.get("/test/leetcode/:username", testLeetcode);
router.get("/test/gfg/:username", testGfg);
router.post("/students/sync/:id", manualSync);



// Everything below requires valid batchSlug
router.use("/:batchSlug", resolveBatch);

/* ---------- Overview ---------- */

// router.get("/:batchSlug/overview", getWorkspaceOverview);

/* ---------- Topics ---------- */

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

// admin student detail // student delete // update 

/* ---------- Analytics ---------- */
    //student?batch-slug//

// /* ---------- Analytics ---------- */

// router.get("/:batchSlug/analytics", getBatchAnalytics);
// router.get("/:batchSlug/leaderboard", getLeaderboard);

export default router;