/**
 * Student Middleware - Student user information extraction
 * Extracts student-specific data from JWT token and attaches to request object
 * Provides student context for student-specific routes and operations
 */

import { Request, Response, NextFunction } from "express";
import { AccessTokenPayload } from "../types/auth.types";

/**
 * Extended Request interface for student-specific data
 */
export interface StudentRequest extends Request {
  student?: AccessTokenPayload;
  studentId?: number;
  batchId?: number;
  batchName?: string;
  batchSlug?: string;
  cityId?: number;
  cityName?: string;
}

/**
 * Extract student information from authenticated user token
 * @param req - Express request object with StudentRequest interface
 * @param res - Express response object
 * @param next - Express next function
 */
export const extractStudentInfo = (req: StudentRequest, res: Response, next: NextFunction): void => {
  const user = req.user as AccessTokenPayload;
  
  if (user?.userType === 'student') {
    // Extract student-specific info from token
    req.student = user;
    req.studentId = user.id;
    req.batchId = user.batchId;
    req.batchName = user.batchName;
    req.batchSlug = user.batchSlug;
    req.cityId = user.cityId;
    req.cityName = user.cityName;
  }
  
  next();
};
