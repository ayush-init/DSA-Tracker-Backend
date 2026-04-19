import { Router } from "express";
import { getAllCities } from "../controllers/city.controller";
import { getAllBatches } from "../controllers/batch.controller";
import { getTopicProgressByUsername, getPaginatedTopics } from "../controllers/topic.controller";
import { bulkUploadClassesAndQuestions } from "../controllers/bulkdata.controller";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

// Public routes - no authentication required
// These routes are used for dropdowns and filters

// Get all cities
router.get("/cities", getAllCities);

// Get all batches
router.get("/batches", getAllBatches);

// Get topic progress by username (public profile view)
router.get("/topicprogress/:username", getTopicProgressByUsername);

// Get paginated topics for dropdown
router.get("/topics", getPaginatedTopics);

// Bulk upload classes and questions for batch
router.post("/bulkdata/:batchSlug", upload.single('csv'), bulkUploadClassesAndQuestions);

export default router;
