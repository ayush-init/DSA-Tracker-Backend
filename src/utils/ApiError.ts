/**
 * API Error Class - Custom error handling for HTTP responses
 * Provides structured error responses with consistent format
 * Extends native Error class with additional properties
 */

export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export class ApiError extends Error {
  statusCode: number;
  data: unknown;
  success: boolean;
  errors: ErrorDetail[];
  code?: string;

  constructor(
    statusCode: number,
    message: string = "Something went wrong",
    errors: ErrorDetail[] = [],
    code?: string,
    stack: string = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;
    if (code) this.code = code;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Pre-defined Error Types - Specialized error classes for common scenarios
 * Provides specific error types with appropriate status codes and error codes
 */

export class ValidationError extends ApiError {
  constructor(message: string = "Validation failed", errors: ErrorDetail[] = []) {
    super(400, message, errors, "VALIDATION_ERROR");
  }
}

export class AuthError extends ApiError {
  constructor(message: string = "Authentication failed") {
    super(401, message, [], "AUTH_ERROR");
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = "Resource not found") {
    super(404, message, [], "NOT_FOUND_ERROR");
  }
}

export class DatabaseError extends ApiError {
  constructor(message: string = "Database operation failed", errors: ErrorDetail[] = []) {
    super(500, message, errors, "DATABASE_ERROR");
  }
}
