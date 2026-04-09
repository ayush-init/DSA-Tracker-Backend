/**
 * Question Types - Question-related interfaces and DTOs
 * Types for question management, assignments, and visibility
 */

// Question Data Transfer Objects
export interface CreateQuestionDTO {
  question_name: string;
  question_url: string;
  question_link?: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  level?: "EASY" | "MEDIUM" | "HARD";
  topic_id: number;
  platform?: "LEETCODE" | "GFG" | "OTHER";
  tags?: string[];
}

export interface UpdateQuestionDTO {
  question_name?: string;
  question_url?: string;
  question_link?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  level?: "EASY" | "MEDIUM" | "HARD";
  topic_id?: number;
  platform?: "LEETCODE" | "GFG" | "OTHER";
  tags?: string[];
}

export interface QuestionResponse {
  id: number;
  question_name: string;
  question_url: string;
  difficulty: string;
  topic_id: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// Question Assignment Types
export interface QuestionAssignmentItem {
  question_id: number;
  type: "HOMEWORK" | "CLASSWORK";
}

export interface AssignQuestionsInput {
  batchId: number;
  topicSlug: string;
  classSlug: string;
  questions: QuestionAssignmentItem[];
}

export interface RemoveQuestionInput {
  batchId: number;
  topicSlug: string;
  classSlug: string;
  questionId: number;
}

export interface QuestionAssignmentData {
  question_id: number;
  type: "HOMEWORK" | "CLASSWORK";
  due_date?: string;
}

// Bulk Question Types
export interface BulkQuestionData {
  question_name: string;
  question_url: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topic_name: string;
  tags?: string[];
}

export interface BulkQuestionUploadDTO {
  questions: BulkQuestionData[];
  topic_id?: number;
}

// Question Query Types
export interface QuestionQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  topic_id?: number;
  assigned?: boolean;
  type?: "HOMEWORK" | "CLASSWORK";
}

// Question Visibility Types
export interface QuestionVisibilityData {
  question_id: number;
  batch_id: number;
  type: "HOMEWORK" | "CLASSWORK";
  due_date?: string;
  assigned_at: string;
}

// Recent Questions Types
export interface RecentQuestionQueryParams {
  date?: string;
  page?: number;
  limit?: number;
}

export interface RecentQuestionResponse {
  id: number;
  question_name: string;
  question_url: string;
  difficulty: string;
  topic_name: string;
  assigned_date: string;
  due_date?: string;
  type: string;
}

// Question Service Input Types
export interface GetAllQuestionsInput {
  topicSlug?: string;
  batchId?: number;
  query?: QuestionQueryParams;
}

export interface GetAssignedInput {
  batchId: number;
  query?: QuestionQueryParams;
}

// Platform Detection Types
export interface PlatformDetectionResult {
  platform: "leetcode" | "gfg" | "unknown";
  questionId?: string;
  isValid: boolean;
}
