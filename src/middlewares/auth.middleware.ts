/**
 * Authentication Middleware - JWT token verification
 * Verifies Bearer tokens and extracts user information for authenticated requests
 * Provides secure authentication middleware for protected routes
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
 * Verify JWT token and extract user information
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @throws ApiError if token is missing, invalid, or malformed
 */
export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  // Check if authorization header exists and has Bearer prefix
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "No token provided or invalid token format", [], "NO_TOKEN");
  }
  
  // Extract token from Bearer header
  const token = authHeader.split(" ")[1];
  
  if (!token) {
    throw new ApiError(401, "Token is required", [], "MISSING_TOKEN");
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, "Invalid or expired token", [], "INVALID_TOKEN");
  }
};