/**
 * Student Controller - Comprehensive student management endpoints
 * Handles student CRUD operations, profile management, username operations, and progress tracking
 * Consolidates student-related functionality from multiple controllers for better organization
 */

import { Request, Response } from "express";
import { StudentRequest } from "../middlewares/student.middleware";
import { ExtendedRequest } from "../types";
import { getCurrentStudentService, updateStudentDetailsService, deleteStudentDetailsService, createStudentService } from "../services/students/student.service";
import { addStudentProgressService, getStudentReportService } from "../services/students/student-progress.service";
import { getAllStudentsService } from "../services/students/student-query.service";
import { formatStudentResponse, validateStudentId, validateAuthenticatedStudent } from "../services/students/student-response.service";
import { getStudentProfileService } from "../services/students/profile-core.service";
import { getPublicStudentProfileService } from "../services/students/profile-public.service";
import { checkUsernameAvailabilityService, updateUsernameService } from "../services/students/username.service";
import prisma from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

/**
 * Get current authenticated student profile
 * Returns formatted student data for header/homepage display
 */
export const getCurrentStudent = asyncHandler(async (req: ExtendedRequest, res: Response) => {
  // Validate authentication using service
  const studentId = validateAuthenticatedStudent(req.user);
 
  if (!studentId) {
    throw new ApiError(401, "Authentication required");
  }

  const student = await getCurrentStudentService(studentId);
 
  // Format response using service
  return res.status(200).json(formatStudentResponse(student));
});

 

export const updateStudentDetails = asyncHandler(async (req: ExtendedRequest, res: Response) => {
  // Validate student ID using service
  const studentId = validateStudentId(req.params.id);

  if (!studentId) {
    throw new ApiError(400, "Invalid student ID");
  }

  const student = await updateStudentDetailsService(
    studentId,
    req.body
  );

  return res.json({
    message: "Student updated successfully",
    data: student
  });
});


export const deleteStudentDetails = asyncHandler(async (req: ExtendedRequest, res: Response) => {
  // Validate student ID using service
  const studentId = validateStudentId(req.params.id);

  if (!studentId) {
    throw new ApiError(400, "Invalid student ID");
  }

  await deleteStudentDetailsService(studentId);

  return res.status(200).json({
    message: "Student deleted permanently"
  });
});

export const getAllStudentsController = asyncHandler(async (req: ExtendedRequest, res: Response) => {
  const result = await getAllStudentsService(req.query);

  return res.status(200).json(result);
});

export const getStudentReportController = asyncHandler(async (
  req: ExtendedRequest,
  res: Response
) => {
  const { username } = req.params;

  const usernameStr = Array.isArray(username) ? username[0] : username;

  const result = await getStudentReportService(usernameStr);

  return res.status(200).json(result);
});

export const createStudentController = asyncHandler(async (req: ExtendedRequest, res: Response) => {
  const student = await createStudentService(req.body);

  return res.status(201).json({
    message: "Student created successfully",
    data: student
  });
});


export const addStudentProgressController = asyncHandler(async (
  req: ExtendedRequest,
  res: Response
) => {
  const { student_id, question_id } = req.body;

  if (!student_id || !question_id) {
    throw new ApiError(400, "student_id and question_id are required", [], "REQUIRED_FIELD");
  }

  const progress = await addStudentProgressService(
    Number(student_id),
    Number(question_id)
  );

  return res.status(201).json({
    message: "Student progress added successfully",
    data: progress
  });
});

// Profile-related controllers
export const getStudentProfile = asyncHandler(async (req: ExtendedRequest, res: Response) => {
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

export const getPublicStudentProfile = asyncHandler(async (req: ExtendedRequest, res: Response) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user?.id; // From optional auth middleware
    
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

/**
 * Update current student's coding platform profiles
 * Updates LeetCode, GFG, GitHub, LinkedIn, and username information
 */
export const updateStudentProfile = asyncHandler(async (req: ExtendedRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    
    // Add validation for studentId
    if (!studentId) {
      throw new ApiError(401, "Student ID not found");
    }

    const { leetcode_id, gfg_id, github, linkedin, username } = req.body;

    const updated = await updateStudentDetailsService(studentId, {
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

// Username-related controllers
/**
 * Check if username is available for registration
 * Supports optional userId to exclude current user from check
 */
export const checkUsernameAvailability = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { username, userId } = req.query;

    if (!username || typeof username !== 'string') {
      throw new ApiError(400, "Username parameter is required", [], "REQUIRED_FIELD");
    }

    const result = await checkUsernameAvailabilityService({ username, userId: userId as string });

    return res.json(result);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Failed to check username availability");
  }
});

export const updateUsername = asyncHandler(async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;
    
    if (!studentId) {
      throw new ApiError(401, "Authentication required");
    }

    const { username } = req.body;

    const updated = await updateUsernameService(studentId, username);

    return res.json({
      message: "Username updated successfully",
      student: updated
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Failed to update username");
  }
});