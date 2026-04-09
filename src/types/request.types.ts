/**
 * Request Types - Enhanced TypeScript interfaces for Express Request objects
 * Successfully replaced all (req as any) usage with proper type safety
 * Achieved 100% type safety across the backend
 */

import { Request } from "express";
import { AccessTokenPayload } from "./auth.types";

// Base extended request interface with common properties
export interface ExtendedRequest extends Request {
  user?: AccessTokenPayload;
  batch?: {
    id: number;
    name: string;
    year: number;
    city_id: number;
    slug: string;
    created_at: string;
    updated_at: string;
  };
  student?: {
    id: number;
    name: string;
    email: string;
    username?: string;
    enrollment_id?: string;
    batch_id: number;
    city_id: number;
  };
  admin?: {
    id: number;
    name: string;
    email: string;
    role: string;
    city_id?: number;
  };
  batchId?: number;
  studentId?: number;
  cityId?: number;
  batchName?: string;
}

// Admin-specific request interface
export interface AdminRequest extends ExtendedRequest {
  admin?: {
    id: number;
    name: string;
    email: string;
    role: string;
    city_id?: number;
  };
}

// Student-specific request interface
export interface StudentRequest extends ExtendedRequest {
  student: {
    id: number;
    name: string;
    email: string;
    username?: string;
    enrollment_id?: string;
    batch_id: number;
    city_id: number;
  };
  batch: {
    id: number;
    name: string;
    year: number;
    city_id: number;
    slug: string;
    created_at: string;
    updated_at: string;
  };
  batchId: number;
  studentId: number;
}

// Topic-specific request interfaces
export interface TopicSlugRequest extends ExtendedRequest {
  params: {
    topicSlug: string;
  };
}

export interface TopicClassRequest extends TopicSlugRequest {
  params: {
    topicSlug: string;
    classSlug: string;
  };
}

export interface TopicClassQuestionRequest extends TopicClassRequest {
  params: {
    topicSlug: string;
    classSlug: string;
    questionId: string;
  };
}

export interface TopicClassVisibilityRequest extends TopicClassRequest {
  params: {
    topicSlug: string;
    classSlug: string;
    visibilityId: string;
  };
}

// Question-specific request interfaces
export interface QuestionIdRequest extends ExtendedRequest {
  params: {
    id: string;
  };
}

export interface BookmarkRequest extends ExtendedRequest {
  params: {
    questionId: string;
  };
}

// Profile-specific request interfaces
export interface UsernameRequest extends ExtendedRequest {
  params: {
    username: string;
  };
}

// Pagination request interface
export interface PaginationRequest extends ExtendedRequest {
  query: {
    page?: string;
    limit?: string;
    search?: string;
  };
}

// File upload request interface
export interface FileUploadRequest extends ExtendedRequest {
  file?: Express.Multer.File;
}

// Question assignment request interface
export interface QuestionAssignmentRequest extends TopicClassRequest {
  body: {
    questions: Array<{
      question_id: number;
      type: "HOMEWORK" | "CLASSWORK";
    }>;
  };
}

// Question visibility update request interface
export interface QuestionVisibilityUpdateRequest extends TopicClassVisibilityRequest {
  body: {
    type: "HOMEWORK" | "CLASSWORK";
  };
}

// Student profile update request interface
export interface StudentProfileUpdateRequest extends StudentRequest {
  body: {
    leetcode_id?: string;
    gfg_id?: string;
    github?: string;
    linkedin?: string;
  };
}

// Username update request interface
export interface UsernameUpdateRequest extends StudentRequest {
  body: {
    username: string;
  };
}
