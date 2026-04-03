import prisma from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export const checkUsernameAvailabilityService = async (
  username: string,
  userId?: string
) => {
  // Trim whitespace
  const trimmedUsername = username.trim();

  // Don't check if username is too short
  if (trimmedUsername.length < 3) {
    return { available: false };
  }

  // Check if username already exists, excluding current user if userId provided
  const whereClause: any = { username: trimmedUsername };
  
  // If userId is provided, exclude current user from the check
  if (userId) {
    whereClause.id = { not: userId };
  }

  const existingStudent = await prisma.student.findUnique({
    where: whereClause,
    select: { id: true }
  });

  return { available: !existingStudent };
};

export const updateUsernameService = async (
  studentId: number,
  username: string
) => {
  if (!username) {
    throw new ApiError(400, "Username is required", [], "REQUIRED_FIELD");
  }

  // Check if username is already taken
  const existingStudent = await prisma.student.findFirst({
    where: {
      username: username,
      id: { not: studentId }
    }
  });

  if (existingStudent) {
    throw new ApiError(409, "Username already taken", [], "USERNAME_TAKEN");
  }

  // Update username
  const updatedStudent = await prisma.student.update({
    where: { id: studentId },
    data: { username },
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

  return updatedStudent;
};