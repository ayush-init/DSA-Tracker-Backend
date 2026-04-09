import { Router } from "express";
import { checkUsernameAvailability } from "../controllers/student.controller";

const router = Router();

// Public route - no authentication required for username check
router.get("/check-username", checkUsernameAvailability);

export default router;
