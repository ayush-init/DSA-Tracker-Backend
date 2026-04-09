/**
 * Admin Middleware - Admin user information extraction
 * Extracts admin-specific data from JWT token and attaches to request object
 * Provides admin context for admin-specific routes and operations
 */

import { Request, Response, NextFunction } from "express";
import { AccessTokenPayload } from "../types/auth.types";

/**
 * Extended Request interface for admin-specific data
 */
export interface AdminRequest extends Request {
  admin?: AccessTokenPayload;
  defaultBatchId?: number;
  defaultBatchName?: string;
  defaultBatchSlug?: string;
  defaultCityId?: number;
  defaultCityName?: string;
}

/**
 * Extract admin information from authenticated user token
 * @param req - Express request object with AdminRequest interface
 * @param res - Express response object
 * @param next - Express next function
 */
export const extractAdminInfo = (req: AdminRequest, res: Response, next: NextFunction): void => {
  const user = req.user as AccessTokenPayload;
  
  if (user?.userType === 'admin') {
    // Extract admin-specific info from token
    req.admin = user;
    req.defaultBatchId = user.batchId;
    req.defaultBatchName = user.batchName;
    req.defaultBatchSlug = user.batchSlug;
    req.defaultCityId = user.cityId;
    req.defaultCityName = user.cityName;
  }
  
  next();
};
