import prisma from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export const updateStudentProfileData = async (
  studentId: number,
  { leetcode_id, gfg_id, github, linkedin, username }: any
) => {
  // Get current student to check if they already have city and batch
  const currentStudent = await prisma.student.findUnique({
    where: { id: studentId },
    select: { city_id: true, batch_id: true }
  });

  if (!currentStudent) {
    throw new ApiError(404, "Student not found", [], "STUDENT_NOT_FOUND");
  }

  // Build update data - only include fields that are provided
  const updateData: any = {};
  
  if (leetcode_id !== undefined) updateData.leetcode_id = leetcode_id;
  if (gfg_id !== undefined) updateData.gfg_id = gfg_id;
  if (github !== undefined) updateData.github = github;
  if (linkedin !== undefined) updateData.linkedin = linkedin;
  if (username !== undefined && username.trim()) updateData.username = username;

  const updated = await prisma.student.update({
    where: { id: studentId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      leetcode_id: true,
      gfg_id: true,
      github: true,
      linkedin: true,
      city_id: true,
      batch_id: true,
      created_at: true
    }
  });

  return updated;
};