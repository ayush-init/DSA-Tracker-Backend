/**
 * Role Middleware - Role-based access control
 * Provides role-based authorization for different user types and admin levels
 * Ensures only authorized users can access specific routes
 */

import { Request, Response, NextFunction } from 'express';
import { AdminRole } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

/**
 * Restrict access to admin users only
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @throws ApiError if user is not an admin
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.userType !== 'admin') {
    throw new ApiError(403, 'Access denied. Admin only.', [], 'INSUFFICIENT_PERMISSIONS');
  }
  next();
};

/**
 * Restrict access to superadmin users only
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @throws ApiError if user is not a superadmin
 */
export const isSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.userType !== 'admin' || req.user?.role !== AdminRole.SUPERADMIN) {
    throw new ApiError(403, 'Access denied. Superadmin only.', [], 'INSUFFICIENT_PERMISSIONS');
  }
  next();
};

/**
 * Restrict access to teachers and superadmins
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @throws ApiError if user is not a teacher or superadmin
 */
export const isTeacherOrAbove = (req: Request, res: Response, next: NextFunction): void => {
  if (
    req.user?.userType !== 'admin' ||
    (req.user?.role !== AdminRole.SUPERADMIN && req.user?.role !== AdminRole.TEACHER)
  ) {
    throw new ApiError(403, 'Access denied. Teacher or Superadmin only.', [], 'INSUFFICIENT_PERMISSIONS');
  }
  next();
};

/**
 * Restrict access to student users only
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @throws ApiError if user is not a student
 */
export const isStudent = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.userType !== 'student') {
    throw new ApiError(403, 'Access denied. Students only.', [], 'INSUFFICIENT_PERMISSIONS');
  }
  next();
};