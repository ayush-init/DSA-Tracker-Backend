import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

/**
 * Middleware to validate request body against a Zod schema
 * Parses and transforms validated data back to req.body
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const formattedErrors = formatZodErrors(result.error);
      throw new ApiError(
        400,
        "Validation failed",
        formattedErrors,
        "VALIDATION_ERROR"
      );
    }

    // Replace req.body with parsed/transformed data
    req.body = result.data;
    next();
  };
};

/**
 * Middleware to validate query parameters against a Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const formattedErrors = formatZodErrors(result.error);
      throw new ApiError(
        400,
        "Invalid query parameters",
        formattedErrors,
        "VALIDATION_ERROR"
      );
    }

    // Merge validated data into req.query (can't replace directly as it's read-only in newer Express)
    Object.assign(req.query, result.data);
    next();
  };
};

/**
 * Middleware to validate URL parameters against a Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const formattedErrors = formatZodErrors(result.error);
      throw new ApiError(
        400,
        "Invalid URL parameters",
        formattedErrors,
        "VALIDATION_ERROR"
      );
    }

    // Merge validated data into req.params (can't replace directly as it's read-only in newer Express)
    Object.assign(req.params, result.data);
    next();
  };
};

/**
 * Format Zod errors into a readable array
 */
const formatZodErrors = (error: ZodError) => {
  if (!error.issues || !Array.isArray(error.issues)) {
    return [{
      field: "unknown",
      message: error.message || "Validation failed",
    }];
  }
  return error.issues.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
};
