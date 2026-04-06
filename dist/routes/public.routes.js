"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const city_controller_1 = require("../controllers/city.controller");
const batch_controller_1 = require("../controllers/batch.controller");
const topic_controller_1 = require("../controllers/topic.controller");
const router = (0, express_1.Router)();
// Public routes - no authentication required
// These routes are used for dropdowns and filters
// Get all cities
router.get("/cities", city_controller_1.getAllCities);
// Get all batches
router.get("/batches", batch_controller_1.getAllBatches);
// Get topic progress by username (public profile view)
router.get("/topicprogress/:username", topic_controller_1.getTopicProgressByUsername);
// Get paginated topics for dropdown
router.get("/topics", topic_controller_1.getPaginatedTopics);
exports.default = router;
