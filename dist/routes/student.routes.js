"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const student_middleware_1 = require("../middlewares/student.middleware");
const topic_controller_1 = require("../controllers/topic.controller");
const class_controller_1 = require("../controllers/class.controller");
const questionVisibility_controller_1 = require("../controllers/questionVisibility.controller");
const leaderboard_controller_1 = require("../controllers/leaderboard.controller");
const studentProfile_controller_1 = require("../controllers/studentProfile.controller");
const uploadphoto_middleware_1 = require("../middlewares/uploadphoto.middleware");
const profileImage_controller_1 = require("../controllers/profileImage.controller");
const batch_controller_1 = require("../controllers/batch.controller");
const profile_controller_1 = require("../controllers/profile.controller");
const router = (0, express_1.Router)();
// Public route - no authentication required
router.get("/profile/:username", studentProfile_controller_1.getPublicStudentProfile); // Public student profile by username
// All routes require authentication + STUDENT role + student info extraction
router.use(auth_middleware_1.verifyToken, role_middleware_1.isStudent, student_middleware_1.extractStudentInfo);
// Batches
router.get("/batches", batch_controller_1.getAllBatches);
// ===== TOPICS ROUTES =====
router.get("/topics", topic_controller_1.getTopicsWithBatchProgress); // All topics with batch-specific classes, total questions per batch, and topic-specific solved question count (frontend will calculate progress percentage)
router.get("/topics/:topicSlug", topic_controller_1.getTopicOverviewWithClassesSummary); // Topic overview with classes summary (name, duration, totalQuestions, solvedQuestions)
// ===== CLASSES ROUTES =====
router.get("/topics/:topicSlug/classes/:classSlug", class_controller_1.getClassDetailsWithFullQuestions); // Class details with full questions array & progress
// ===== Global  QUESTIONS ROUTES =====
router.get("/addedQuestions", questionVisibility_controller_1.getAllQuestionsWithFilters); // All questions with filters and solved status
// ===== LEADERBOARD ROUTES =====
router.post("/leaderboard", leaderboard_controller_1.getStudentLeaderboard); // Single student leaderboard with top 10 and personal rank
// ===== PROFILE IMAGE ROUTES =====
router.post("/profile-image", uploadphoto_middleware_1.uploadSingle, profileImage_controller_1.uploadProfileImage); // Upload/Update profile image
router.delete("/profile-image", profileImage_controller_1.deleteProfileImage); // Delete profile image
router.get("/profile-image", profileImage_controller_1.getProfileImage); // Get profile image URL
router.get("/profile", studentProfile_controller_1.getStudentProfile); // Complete student profile with all sections
router.put("/profile", profile_controller_1.completeProfile); // Update student profile (leetcode, gfg, etc)
exports.default = router;
