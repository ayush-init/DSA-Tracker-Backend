/**
 * Username Service - Username validation and management
 * Handles username availability checking and updates with proper validation
 * Ensures unique usernames across the system with conflict resolution
 */

import prisma from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { UsernameCheckParams, CheckUsernameAvailabilityResponse } from '../../types/student.types';

/**
 * Check if username is available for registration or update
 * @param params - Username and optional userId to exclude from check
 * @returns Promise with availability status
 */
export const checkUsernameAvailabilityService = async (
  params: UsernameCheckParams
): Promise<CheckUsernameAvailabilityResponse> => {
  // Trim whitespace
  const trimmedUsername = params.username.trim().toLowerCase();

  // Don't check if username is too short
  if (trimmedUsername.length < 3) {
    return { available: false };
  }

  // Check if username already exists, excluding current user if userId provided
  const { userId } = params;
  
  const whereClause: { username: string; id?: { not: number } } = { username: trimmedUsername };
  
  // If userId is provided, exclude current user from the check
  if (userId) {
    whereClause.id = { not: parseInt(userId) };
  }

  const existingStudent = await prisma.student.findFirst({
    where: whereClause,
    select: { id: true }
  });

  return { available: !existingStudent };
};

/**
 * Update student's username with conflict checking
 * @param studentId - Student ID to update
 * @param username - New username to set
 * @returns Updated student data
 */
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