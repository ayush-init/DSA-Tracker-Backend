/**
 * API Types - Common API response and request types
 * Standardized interfaces for API responses and request handling
 */

// API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  code?: string;
}

// Common query parameters
export interface QueryParams {
  page?: string | number;
  limit?: string | number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Pagination parameters
export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
}

// Database query conditions
export interface WhereCondition {
  [key: string]: any;
  OR?: WhereCondition[];
  AND?: WhereCondition[];
}

// Error handling types
export interface ErrorDetails {
  message: string;
  code?: string;
  field?: string;
}

// Request context for logging
export interface RequestContext {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  studentId?: number;
  userId?: number;
  operation?: string;
  duration?: number;
  [key: string]: any;
}
