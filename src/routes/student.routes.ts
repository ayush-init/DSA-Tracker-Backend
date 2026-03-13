import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware";
import { isStudent } from "../middlewares/role.middleware";
import { extractStudentInfo } from "../middlewares/student.middleware";
import { getTopicsWithBatchProgress, getTopicOverviewWithClassesSummary } from "../controllers/topic.controller";
import { getClassDetailsWithFullQuestions } from "../controllers/class.controller";
import { getAllQuestionsWithFilters } from "../controllers/questionVisibility.controller";
import { getStudentLeaderboard } from "../controllers/leaderboard.controller";
import { getStudentProfile } from "../controllers/studentProfile.controller";

const router = Router();

// All routes require authentication + STUDENT role + student info extraction
router.use(verifyToken, isStudent, extractStudentInfo);



// ===== TOPICS ROUTES =====
router.get("/topics", getTopicsWithBatchProgress); // All topics with batch-specific classes, total questions per batch, and topic-specific solved question count (frontend will calculate progress percentage)
router.get("/topics/:topicSlug", getTopicOverviewWithClassesSummary); // Topic overview with classes summary (name, duration, totalQuestions, solvedQuestions)

// ===== CLASSES ROUTES =====
router.get("/topics/:topicSlug/classes/:classSlug", getClassDetailsWithFullQuestions); // Class details with full questions array & progress

// ===== Global  QUESTIONS ROUTES =====
router.get("/addedQuestions", getAllQuestionsWithFilters); // All questions with filters and solved status

// ===== LEADERBOARD ROUTES =====
router.post("/leaderboard", getStudentLeaderboard); // Single student leaderboard with top 10 and personal rank

// ===== PROFILE ROUTES =====
// router.get("/profile/lite", getStudentProfileLite); // Fast loading - essential data only
router.get("/profile", getStudentProfile); // Complete student profile with all sections


// router.get("/test/basic", testStudentBasicInfo);
// router.get("/test/stats", testCodingStats);
// router.get("/test/streak", testStreak);
// router.get("/test/leaderboard", testLeaderboard);
// router.get("/test/heatmap", testHeatmap);
// router.get("/test/topic", testTopicProgress);
// router.get("/test/activity", testRecentActivity);
export default router;