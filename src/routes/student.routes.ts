import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware";
import { isStudent } from "../middlewares/role.middleware";
import { extractStudentInfo } from "../middlewares/student.middleware";
import { optionalAuth } from "../middlewares/optionalAuth.middleware";
import { getTopicsWithBatchProgress, getTopicOverviewWithClassesSummary } from "../controllers/topic.controller";
import { getClassDetailsWithFullQuestions } from "../controllers/class.controller";
import { getAllQuestionsWithFilters } from "../controllers/questionVisibility.controller";
import { getStudentLeaderboard } from "../controllers/leaderboard.controller";
import { getPublicStudentProfile } from "../controllers/studentProfile.controller";
import { getCurrentStudent } from "../controllers/student.controller";
import { updateStudentProfile } from "../controllers/updateStudentProfile.controller";
import { getStudentById } from "../controllers/getStudentById.controller";
import { uploadSingle } from '../middlewares/uploadphoto.middleware';
import { uploadProfileImage, deleteProfileImage, getProfileImage } from '../controllers/profileImage.controller';
import { getAllBatches } from "../controllers/batch.controller";
import { getAllCities } from "../controllers/city.controller";
import { completeProfile } from "../controllers/profile.controller";

const router = Router();

// Public route - optional authentication for canEdit flag
router.get("/profile/:username", optionalAuth, getPublicStudentProfile);

// All routes below require authentication + STUDENT role + student info extraction
router.use(verifyToken, isStudent, extractStudentInfo);

// Current student info (lightweight - for header/homepage)
router.get("/me", getCurrentStudent);

// Update current student profile (coding profiles, etc.)
router.put("/me", updateStudentProfile);

// Batches
router.get("/batches", getAllBatches);

// Cities
router.get("/cities", getAllCities);

// ===== TOPICS ROUTES =====
router.get("/topics", getTopicsWithBatchProgress); // All topics with batch-specific classes, total questions per batch, and topic-specific solved question count (frontend will calculate progress percentage)
router.get("/topics/:topicSlug", getTopicOverviewWithClassesSummary); // Topic overview with classes summary (name, duration, totalQuestions, solvedQuestions)

// ===== CLASSES ROUTES =====
router.get("/topics/:topicSlug/classes/:classSlug", getClassDetailsWithFullQuestions); // Class details with full questions array & progress

// ===== Global  QUESTIONS ROUTES =====
router.get("/addedQuestions", getAllQuestionsWithFilters); // All questions with filters and solved status

// ===== LEADERBOARD ROUTES =====
router.post("/leaderboard", getStudentLeaderboard); // Single student leaderboard with top 10 and personal rank

// ===== PROFILE IMAGE ROUTES =====
router.post("/profile-image", uploadSingle, uploadProfileImage);  // Upload/Update profile image
router.delete("/profile-image", deleteProfileImage);              // Delete profile image
router.get("/profile-image", getProfileImage); // Get profile image URL

router.put("/profile", completeProfile); // Update student profile (leetcode, gfg, etc)

export default router;