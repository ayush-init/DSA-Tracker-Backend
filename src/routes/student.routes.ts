import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware";
import { isStudent } from "../middlewares/role.middleware";
import { extractStudentInfo } from "../middlewares/student.middleware";




const router = Router();

// All routes require authentication + STUDENT role + student info extraction
router.use(verifyToken, isStudent, extractStudentInfo);

export default router;