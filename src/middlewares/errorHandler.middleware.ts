/**
 * Error Handler Middleware - Centralized error processing
 * Handles all application errors and provides consistent error responses
 * Logs errors appropriately and formats responses based on environment
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

/**
 * Centralized error handler middleware
 * @param err - Error object (any type of error)
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = err;

  // Convert non-ApiError errors to ApiError
  if (!(error instanceof ApiError)) {
    const statusCode = err && typeof err === 'object' && 'statusCode' in err 
      ? (err as any).statusCode 
      : 500;
    const message = err instanceof Error ? err.message : 'Something went wrong';
    const stack = err instanceof Error ? err.stack : undefined;
    
    error = new ApiError(
      statusCode, 
      message, 
      [], 
      "INTERNAL_ERROR", 
      stack
    );
  }

  // Now error is guaranteed to be ApiError
  const apiError = error as ApiError;

  // Log error using our logger
  logger.error(`${apiError.code || 'ERROR'} - ${apiError.message}`, apiError);

  // Build error response
  const response = {
    success: false,
    message: apiError.message,
    code: apiError.code || 'ERROR',
    statusCode: apiError.statusCode,
    // Only send stack trace in development
    ...(process.env.NODE_ENV !== 'production' && { stack: apiError.stack }),
  };

  res.status(apiError.statusCode).json(response);
};
