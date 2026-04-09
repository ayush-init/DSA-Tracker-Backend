/**
 * Utility Types - Utility interfaces and helper types
 * Types for validation, error handling, and utility functions
 */

// Password Validation Types
export interface PasswordValidationResult {
  isValid: boolean;
  message: string;
  strength: 'weak' | 'medium' | 'strong';
  missingRequirements: string[];
}

export interface PasswordRule {
  regex: RegExp;
  message: string;
  description: string;
}

// Username Generation Types
export interface UsernameGenerationOptions {
  name: string;
  enrollmentId?: string;
}

export interface GeneratedUsername {
  baseUsername: string;
  finalUsername: string;
  isDuplicate: boolean;
}

// Streak Calculation Types
export interface StreakResult {
  currentStreak: number;
  maxStreak: number;
}

export interface QuestionAvailability {
  date: string;
  hasQuestion: boolean;
}

// Error Handling Types
export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface DatabaseError {
  code: string;
  message: string;
  meta?: any;
}

export interface PrismaKnownError {
  code: string;
  message: string;
  meta?: any;
}

// Validation Error Types
export interface ValidationError extends Error {
  statusCode?: number;
  code?: string;
  type?: string;
}

// External Service Types
export interface LeetcodeSubmission {
  id: string;
  title: string;
  difficulty: string;
  timestamp: string;
  status: string;
}

export interface GfgApiResponse {
  status: string;
  data: any;
  message?: string;
}

// File Upload Types
export interface FileUploadResult {
  filename: string;
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export interface S3UploadResult {
  location: string;
  key: string;
  bucket: string;
  etag: string;
}

// Cache Types
export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  key: string;
}

export interface CacheResult<T = any> {
  data: T;
  cached: boolean;
  timestamp: number;
}

// Rate Limiting Types
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

// Performance Monitoring Types
export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface PerformanceOptions {
  includeMemory?: boolean;
  includeCpu?: boolean;
  threshold?: number;
}

// Request Deduplication Types
export interface DeduplicationOptions {
  ttl?: number; // Time to live in milliseconds (default: 5000)
  keyGenerator?: (req: any) => string;
}

// Script Types
export interface ClassCreationResult {
  batchId: number;
  batchName: string;
  topicId: number;
  topicName: string;
  classesCreated: number;
  questionsAssigned: number;
  errors?: string[];
}

// Leaderboard Types
export interface LeaderboardEntry {
  rank: number;
  student: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
  total_solved: number;
  current_streak: number;
  max_streak: number;
  last_solved_at?: string;
}

export interface LeaderboardQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  batch_id?: number;
  year?: number;
  city_id?: number;
}
