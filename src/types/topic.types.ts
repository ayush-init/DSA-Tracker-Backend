/**
 * Topic Types - Topic and class management interfaces
 * Types for topic operations, class management, and progress tracking
 */

import { AdminRole } from "@prisma/client";
import { QueryParams } from './api.types';

// Topic Data Transfer Objects
export interface CreateTopicDTO {
  topic_name: string;
  photo?: Express.Multer.File;
}

export interface UpdateTopicDTO {
  topic_name?: string;
  photo?: Express.Multer.File;
  removePhoto?: boolean;
}

export interface UpdateTopicInput {
  topicSlug: string;
  topic_name?: string;
  photo?: Express.Multer.File;
  removePhoto?: boolean;
}

export interface DeleteTopicInput {
  topicSlug: string;
}

export interface TopicResponse {
  id: number;
  topic_name: string;
  slug: string;
  photo_url?: string | null;
  created_at: string;
  updated_at: string;
}

// Bulk Topic Types
export interface BulkTopicData {
  topic_name: string;
  photo?: Express.Multer.File;
}

export interface BulkTopicUploadDTO {
  topics: BulkTopicData[];
}

// Topic Query Types
export interface TopicQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

// Class Management Types
export interface CreateClassDTO {
  batchId: number;
  topicSlug: string;
  class_name: string;
  description?: string;
  pdf_url?: string;
  pdf_file?: Express.Multer.File;
  duration_minutes?: number | string;
  class_date?: string;
}

export interface UpdateClassDTO {
  batchId: number;
  topicSlug: string;
  classSlug: string;
  class_name?: string;
  description?: string;
  pdf_url?: string;
  pdf_file?: Express.Multer.File;
  duration_minutes?: number | string;
  class_date?: string;
  removePdf?: boolean;
}

export interface ClassResponse {
  id: number;
  class_name: string;
  slug: string;
  description?: string | null;
  pdf_url?: string | null;
  duration_minutes?: number | null;
  class_date?: string | null;
  created_at: string;
  updated_at: string;
}

// Class Service Input Types
export interface CreateClassInput {
  batchId: number;
  topicSlug: string;
  class_name: string;
  description?: string;
  pdf_url?: string;
  pdf_file?: Express.Multer.File;
  duration_minutes?: number | string;
  class_date?: string;
}

export interface UpdateClassInput {
  batchId: number;
  topicSlug: string;
  classSlug: string;
  class_name?: string;
  description?: string;
  pdf_url?: string;
  pdf_file?: Express.Multer.File;
  duration_minutes?: number | string;
  class_date?: string;
  removePdf?: boolean;
  remove_pdf?: boolean;
}

export interface DeleteClassInput {
  batchId: number;
  topicSlug: string;
  classSlug: string;
}

// Topic Service Input Types
export interface GetTopicsForBatchInput {
  batchId: number;
  query?: any;
}

export interface GetTopicsWithBatchProgressInput {
  studentId: number;
  batchId: number;
  query?: QueryParams;
}

export interface GetTopicOverviewWithClassesSummaryInput {
  studentId: number;
  batchId: number;
  topicSlug: string;
  query?: QueryParams;
}
