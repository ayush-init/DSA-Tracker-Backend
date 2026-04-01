import { Request, Response } from "express";
import { StudentRequest } from "../middlewares/student.middleware";
import { getStudentProfileService, getPublicStudentProfileService } from "../services/studentProfile.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const getStudentProfile = asyncHandler(async (req: StudentRequest, res: Response) => {
          try {
            const studentId = req.user?.id;
            
            if (!studentId) {
              throw new ApiError(500, "Failed to get student profile", [], "INTERNAL_SERVER_ERROR");
            }

            const profile = await getStudentProfileService(studentId);
            res.json(profile);
          } catch (error) {
    if (error instanceof ApiError) throw error;
            console.error("Profile error:", error);
            throw new ApiError(500, error instanceof Error ? error.message : "Failed to get student profile", [], "INTERNAL_SERVER_ERROR");
          }
        });

export const getPublicStudentProfile = asyncHandler(async (req: Request, res: Response) => {
          try {
            const { username } = req.params;
            const currentUserId = (req as any).user?.id; // From optional auth middleware
            
            if (!username || Array.isArray(username)) {
              throw new ApiError(400, "Username is required", [], "REQUIRED_FIELD");
            }

            const profile = await getPublicStudentProfileService(username);
            
            // Add canEdit flag if current user is viewing their own profile
            const canEdit = currentUserId && profile.student.id === currentUserId;
            
            res.json({ ...profile, canEdit });
          } catch (error) {
    if (error instanceof ApiError) throw error;
            console.error("Public profile error:", error);
            throw new ApiError(500, "Failed to get public student profile", [], "INTERNAL_SERVER_ERROR");
          }
        });
