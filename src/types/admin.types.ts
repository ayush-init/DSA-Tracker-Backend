/**
 * Admin Types - Admin-related interfaces and DTOs
 * Types for admin management, stats, and administrative operations
 */

import { AdminRole } from "@prisma/client";

// Admin Data Transfer Objects
export interface CreateAdminDTO {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
  city_id?: number;
}

export interface UpdateAdminDTO {
  name?: string;
  email?: string;
  password?: string;
  role?: AdminRole;
  city_id?: number;
}

export interface AdminResponse {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  city_id?: number;
  created_at: string;
  updated_at: string;
}

// Admin Query Types
export interface AdminQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: AdminRole;
  city_id?: number;
}

// Admin Stats Types
export interface AdminStatsResponse {
  total_students: number;
  total_questions: number;
  total_topics: number;
  total_batches: number;
  total_cities: number;
  recent_activity: {
    new_students: number;
    new_questions: number;
    new_topics: number;
  };
}

export interface SuperAdminStatsResponse {
  total_admins: number;
  total_students: number;
  total_questions: number;
  total_topics: number;
  total_batches: number;
  total_cities: number;
  recent_activity: {
    new_admins: number;
    new_students: number;
    new_questions: number;
    new_topics: number;
  };
}

// City Management Types
export interface CreateCityDTO {
  city_name: string;
}

export interface UpdateCityDTO {
  city_name: string;
}

export interface CityResponse {
  id: number;
  city_name: string;
  created_at: string;
  updated_at: string;
}

// City Service Input Types
export interface UpdateCityInput {
  id: number;
  city_name: string;
}

export interface DeleteCityInput {
  id: number;
}

// Batch Management Types
export interface CreateBatchDTO {
  batch_name: string;
  year: number;
  city_id: number;
}

export interface UpdateBatchDTO {
  batch_name?: string;
  year?: number;
  city_id?: number;
}

export interface BatchResponse {
  id: number;
  batch_name: string;
  year: number;
  city_id: number;
  slug: string;
  created_at: string;
  updated_at: string;
}

// Batch Service Input Types
export interface UpdateBatchInput {
  id: number;
  batch_name?: string;
  year?: number;
  city_id?: number;
}

export interface DeleteBatchInput {
  id: number;
}

export interface BatchQueryParams {
  city?: string;
  year?: number;
}

// CSV Report Types
export interface CsvReportData {
  batch_id: number;
}

export interface CsvReportResponse {
  filename: string;
  content: string;
  generated_at: string;
}

// Admin Request Types
export interface AdminRequest {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  city_id?: number;
  cityName?: string;
}
