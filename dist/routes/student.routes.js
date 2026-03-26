"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const student_middleware_1 = require("../middlewares/student.middleware");
const optionalAuth_middleware_1 = require("../middlewares/optionalAuth.middleware");
const topic_controller_1 = require("../controllers/topic.controller");
const class_controller_1 = require("../controllers/class.controller");
const questionVisibility_controller_1 = require("../controllers/questionVisibility.controller");
const leaderboard_controller_1 = require("../controllers/leaderboard.controller");
const studentProfile_controller_1 = require("../controllers/studentProfile.controller");
const student_controller_1 = require("../controllers/student.controller");
const updateStudentProfile_controller_1 = require("../controllers/updateStudentProfile.controller");
const uploadphoto_middleware_1 = require("../middlewares/uploadphoto.middleware");
const profileImage_controller_1 = require("../controllers/profileImage.controller");
const batch_controller_1 = require("../controllers/batch.controller");
const city_controller_1 = require("../controllers/city.controller");
const username_controller_1 = require("../controllers/username.controller");
const recentQuestions_controller_1 = require("../controllers/recentQuestions.controller");
const router = (0, express_1.Router)();
// Public route - optional authentication for canEdit flag
router.get("/profile/:username", optionalAuth_middleware_1.optionalAuth, studentProfile_controller_1.getPublicStudentProfile);
// All routes below require authentication + STUDENT role + student info extraction
router.use(auth_middleware_1.verifyToken, role_middleware_1.isStudent, student_middleware_1.extractStudentInfo);
// Current student info (lightweight - for header/homepage)
router.get("/me", student_controller_1.getCurrentStudent);
// Update current student profile (coding profiles, etc.)
router.put("/me", updateStudentProfile_controller_1.updateStudentProfile);
// Batches
router.get("/batches", batch_controller_1.getAllBatches);
// Cities
router.get("/cities", city_controller_1.getAllCities);
// ===== TOPICS ROUTES =====
router.get("/topics", topic_controller_1.getTopicsWithBatchProgress); // All topics with batch-specific classes, total questions per batch, and topic-specific solved question count (frontend will calculate progress percentage)
router.get("/topics/:topicSlug", topic_controller_1.getTopicOverviewWithClassesSummary); // Topic overview with classes summary (name, duration, totalQuestions, solvedQuestions)
// ===== CLASSES ROUTES =====
router.get("/topics/:topicSlug/classes/:classSlug", class_controller_1.getClassDetailsWithFullQuestions); // Class details with full questions array & progress
// ===== Global  QUESTIONS ROUTES =====
router.get("/addedQuestions", questionVisibility_controller_1.getAllQuestionsWithFilters); // All questions with filters and solved status
router.get("/recent-questions", recentQuestions_controller_1.getRecentQuestions); // Recently added questions (last 7 days by default)
// ===== LEADERBOARD ROUTES =====
router.post("/leaderboard", leaderboard_controller_1.getStudentLeaderboard); // Single student leaderboard with top 10 and personal rank
// ===== PROFILE IMAGE ROUTES =====
router.post("/profile-image", uploadphoto_middleware_1.uploadSingle, profileImage_controller_1.uploadProfileImage); // Upload/Update profile image
router.delete("/profile-image", profileImage_controller_1.deleteProfileImage); // Delete profile image
router.patch("/username", username_controller_1.updateUsername); // Update username only
exports.default = router;
