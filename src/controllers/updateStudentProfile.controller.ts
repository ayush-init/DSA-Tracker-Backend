import { Request, Response } from "express";
import { updateStudentProfileData } from "../services/profile.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const updateStudentProfile = asyncHandler(async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;
    
    // ✅ Add validation for studentId
    if (!studentId) {
      throw new ApiError(401, "Student ID not found");
    }

    const { leetcode_id, gfg_id, github, linkedin, username } = req.body;

    const updated = await updateStudentProfileData(studentId, {
      leetcode_id,
      gfg_id,
      github,
      linkedin,
      username
    });

    res.json({
      message: "Profile updated successfully",
      student: updated
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Failed to update profile");
  }
});