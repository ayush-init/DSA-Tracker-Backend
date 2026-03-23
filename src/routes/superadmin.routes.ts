import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware";
import { isSuperAdmin } from "../middlewares/role.middleware";
// City controllers
import { 
  createCity, 
  getAllCities, 
  deleteCity
} from "../controllers/city.controller";

// Batch controllers
import { 
  createBatch,
  deleteBatch,
  getAllBatches,
  updateBatch, 
} from "../controllers/batch.controller";

// Admin management
import { getAllAdminsController, updateAdminController, deleteAdminController, createAdminController } from "../controllers/admin.controller";
import { getSuperAdminStats } from "../controllers/superadminStats.controller";

const router = Router();


// All routes require authentication + SUPERADMIN role
router.use(verifyToken, isSuperAdmin);

// ===== CITY =====

router.post("/cities", createCity);
router.get("/cities", getAllCities);
router.delete("/cities/:id", deleteCity);


// ===== BATCH =====
router.get("/batches", getAllBatches);
router.post("/batches", createBatch);
router.patch("/batches/:id", updateBatch);
router.delete("/batches/:id", deleteBatch);



// ===== ADMIN MANAGEMENT =====
router.post("/admins", createAdminController);                    // Create admin (SuperAdmin - auto fetch city_id from batch)
router.get("/admins", getAllAdminsController);             // Get all admins with filters
router.patch("/admins/:id", updateAdminController);           // Update admin (SuperAdmin - only role & batch_id allowed)
router.delete("/admins/:id", deleteAdminController);         // Delete admin



// ===== SYSTEM STATS =====
router.get("/stats", getSuperAdminStats);                       // Get system-wide statistics                // Get batch-specific admin statistics

export default router;