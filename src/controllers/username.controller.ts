import { Request, Response } from "express";
import { checkUsernameAvailabilityService, updateUsernameService } from "../services/username.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const checkUsernameAvailability = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { username, userId } = req.query;

    if (!username || typeof username !== 'string') {
      throw new ApiError(400, "Username parameter is required", [], "REQUIRED_FIELD");
    }

    const result = await checkUsernameAvailabilityService(username, userId as string);

    res.json(result);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Failed to check username availability", [], "INTERNAL_SERVER_ERROR");
  }
});

export const updateUsername = asyncHandler(async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { username } = req.body;

    if (!studentId) {
      throw new ApiError(401, "Student not authenticated", [], "UNAUTHORIZED");
    }

    const updatedStudent = await updateUsernameService(studentId, username);

    res.json({
      message: "Username updated successfully",
      student: updatedStudent
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Failed to update username", [], "INTERNAL_SERVER_ERROR");
  }
});