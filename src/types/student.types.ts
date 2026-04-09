/**
 * Student Types - Student-related interfaces and DTOs
 * Types for student data, profiles, responses, and operations
 */

// Student Data Transfer Objects
export interface CreateStudentDTO {
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

export interface UpdateStudentDTO {
  name?: string;
  email?: string;
  username?: string;
  leetcode_id?: string;
  gfg_id?: string;
  github?: string;
  linkedin?: string;
}

export interface StudentResponse {
  id: number;
  name: string;
  email: string;
  username?: string;
  enrollment_id?: string;
  leetcode_id?: string;
  gfg_id?: string;
  github?: string;
  linkedin?: string;
  city_id?: number;
  batch_id?: number;
  created_at: string;
  updated_at: string;
}

// Profile Management Types
export interface ProfileUpdateDTO {
  leetcode_id?: string;
  gfg_id?: string;
  github?: string;
  linkedin?: string;
  username?: string;
}

export interface UsernameCheckParams {
  username: string;
  userId?: string;
}

export interface CheckUsernameAvailabilityResponse {
  available: boolean;
}

// Student Progress Types
export interface StudentProgressData {
  id: number;
  student_id: number;
  question_id: number;
  status: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// Heatmap and Analytics Types
export interface HeatmapData {
  date: string;
  count: number;
}

export interface HeatmapInput {
  startDate: Date;
  endDate: Date;
  assignedDates: Set<string>;
  submissionCounts: Map<string, number>;
  completedAll: boolean;
}

// Student Query Types
export interface StudentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  batch_id?: number;
  city_id?: number;
}

// Student Response Formatting
export interface StudentResponseData {
  id: number;
  name: string;
  username: string;
  email: string;
  profile_image_url?: string | null;
  leetcode_id?: string | null;
  gfg_id?: string | null;
  city?: {
    id: number;
    city_name: string;
  } | null;
  batch?: {
    id: number;
    batch_name: string;
    year: number;
  } | null;
}
