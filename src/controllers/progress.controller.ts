/**
 * Progress Controller - Student progress synchronization endpoints
 * Handles manual sync operations for student progress from external platforms
 * Provides progress tracking and synchronization management
 */

import { Request, Response } from "express";
import { syncOneStudent } from "../services/progressSync/sync-core.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

/**
 * Manual sync of student progress from external platforms
 * @param req - Request with student ID in params
 * @param res - Response with sync results
 */
export const manualSync = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Validate student ID parameter
  if (!id || isNaN(Number(id))) {
    throw new ApiError(400, "Valid student ID is required", [], "INVALID_STUDENT_ID");
  }
  
  const studentId = Number(id);
  
  const result = await syncOneStudent(studentId);
  
  return res.status(200).json({
    success: true,
    message: "Student progress synchronized successfully",
    data: result
  });
});