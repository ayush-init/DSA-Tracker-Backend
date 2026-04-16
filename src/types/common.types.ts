/**
 * Common TypeScript interfaces for the DSA Tracker application
 * Replaces 'any' types with proper type definitions for better type safety
 * Provides standardized interfaces used across controllers and services
 */

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

// API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  code?: string;
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

// Student data types
export interface StudentData {
  name: string;
  email: string;
  username?: string;
  password: string;
  enrollment_id?: string;
  leetcode_id?: string;
  gfg_id?: string;
  github?: string;
  linkedin?: string;
  city_id?: number;
  batch_id?: number;
}

// Student update data
export interface StudentUpdateData {
  name?: string;
  email?: string;
  username?: string;
  leetcode_id?: string;
  gfg_id?: string;
  github?: string;
  linkedin?: string;
  batch_id?: number;
  city_id?: number;
}

// Topic data types
export interface TopicData {
  topic_name: string;
  photo?: Express.Multer.File;
}

// Topic update data
export interface TopicUpdateData {
  topic_name?: string;
  photo?: Express.Multer.File;
  removePhoto?: boolean;
}

// Class data types
export interface ClassData {
  class_name: string;
  description?: string;
  pdf_url?: string;
  class_date?: string;
}

// Class update data
export interface ClassUpdateData {
  class_name?: string;
  description?: string;
  pdf_url?: string;
  class_date?: string;
  removePdf?: boolean;
}

// Question assignment data
export interface QuestionAssignmentItem {
  question_id: number;
  type: "HOMEWORK" | "CLASSWORK";
}

// Bulk topic creation data
export interface BulkTopicData {
  topic_name: string;
  slug: string;
}

// CSV report data
export interface CsvReportData {
  batch_id: number;
}

// Username availability check
export interface UsernameCheckParams {
  username: string;
  userId?: string;
}

// Profile update data
export interface ProfileUpdateData {
  leetcode_id?: string;
  gfg_id?: string;
  github?: string;
  linkedin?: string;
  username?: string;
}

// Database error types
export interface DatabaseError {
  code: string;
  message: string;
  meta?: any;
}

// Prisma known request error
export interface PrismaKnownError {
  code: string;
  message: string;
  meta?: any;
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
