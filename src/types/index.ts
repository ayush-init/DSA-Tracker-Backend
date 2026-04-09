/**
 * Types Index - Centralized export of all type definitions
 * Provides a single entry point for importing all types
 */

// API Types
export * from './api.types';

// Re-export all types from individual files
export * from './api.types';
export * from './auth.types';
export * from './student.types';
export * from './topic.types';
export * from './question.types';
export * from './admin.types';
export * from './utility.types';
export * from './express.types';
export * from './request.types';

// Utility Types
export * from './utility.types';

// Express Types
export * from './express.types';

// Re-export commonly used types for convenience
export type {
  // API
  ApiResponse,
  QueryParams,
  PaginationParams,
  ErrorDetails,
} from './api.types';

export type {
  // Auth
  AccessTokenPayload,
  RefreshTokenPayload,
  LoginRequest,
  RegisterRequest,
} from './auth.types';

export type {
  // Student
  CreateStudentDTO,
  UpdateStudentDTO,
  StudentResponse,
  ProfileUpdateDTO,
} from './student.types';

export type {
  // Topic
  CreateTopicDTO,
  UpdateTopicDTO,
  TopicResponse,
  CreateClassDTO,
  UpdateClassDTO,
  ClassResponse,
} from './topic.types';

export type {
  // Question
  CreateQuestionDTO,
  UpdateQuestionDTO,
  QuestionResponse,
  QuestionAssignmentItem,
} from './question.types';

export type {
  // Admin
  CreateAdminDTO,
  UpdateAdminDTO,
  AdminResponse,
  CreateCityDTO,
  UpdateCityDTO,
  CityResponse,
  CreateBatchDTO,
  UpdateBatchDTO,
  BatchResponse,
} from './admin.types';

export type {
  // Utility
  PasswordValidationResult,
  UsernameGenerationOptions,
  StreakResult,
  ErrorDetail,
} from './utility.types';

export type {
  // Express
  AdminRequest,
  StudentRequest,
  RequestWithUser,
  RequestWithAdmin,
  RequestWithStudent,
  MulterFile,
} from './express.types';
