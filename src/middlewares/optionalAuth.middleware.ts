/**
 * Optional Authentication Middleware - Optional JWT verification
 * Provides optional authentication that doesn't block requests if no token is provided
 * Useful for routes that work with or without authentication
 */

import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.util";
import { AccessTokenPayload } from "../types/auth.types";
import { ApiError } from "../utils/ApiError";

// Extend Express Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/**
 * Optional authentication middleware - continues regardless of auth status
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // No token provided, continue without authentication
    return next();
  }

  // Extract token from Bearer header
  const token = authHeader.split(" ")[1];
  
  if (!token) {
    // No token provided, continue without authentication
    return next();
  }

  try {
    // Verify token using our JWT utility
    const decoded = verifyAccessToken(token);
    
    // Attach user to request with same structure as other middleware
    req.user = decoded;
    next();
  } catch (error: unknown) {
    // Invalid token, continue without authentication
    // This is optional auth, so we don't throw errors
    next();
  }
};
