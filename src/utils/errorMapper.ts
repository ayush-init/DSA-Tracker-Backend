import { ApiError } from './ApiError';

export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
} as const;

export const ERROR_MESSAGES = {
  // 400 Bad Request
  BAD_REQUEST: 'Bad request',
  INVALID_INPUT: 'Invalid input provided',
  MISSING_REQUIRED_FIELDS: 'Required fields are missing',
  INVALID_EMAIL_FORMAT: 'Invalid email format',
  INVALID_PASSWORD: 'Password does not meet requirements',
  
  // 401 Unauthorized
  UNAUTHORIZED: 'Authentication required',
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_MISSING: 'Authentication token is required',
  TOKEN_EXPIRED: 'Authentication token has expired',
  
  // 403 Forbidden
  FORBIDDEN: 'Access denied',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',
  INVALID_TOKEN: 'Invalid or corrupted authentication token',
  
  // 404 Not Found
  NOT_FOUND: 'Resource not found',
  USER_NOT_FOUND: 'User not found',
  STUDENT_NOT_FOUND: 'Student not found',
  TOPIC_NOT_FOUND: 'Topic not found',
  QUESTION_NOT_FOUND: 'Question not found',
  BATCH_NOT_FOUND: 'Batch not found',
  
  // 409 Conflict
  CONFLICT: 'Resource conflict',
  EMAIL_EXISTS: 'Email already exists',
  USERNAME_EXISTS: 'Username already exists',
  ENROLLMENT_ID_EXISTS: 'Enrollment ID already exists',
  DUPLICATE_ENTRY: 'Duplicate entry found',
  
  // 422 Unprocessable Entity
  UNPROCESSABLE_ENTITY: 'Request could not be processed',
  STUDENT_NOT_REGISTERED: 'Student not registered by admin',
  INVALID_STATE: 'Invalid operation state',
  
  // 500 Internal Server Error
  INTERNAL_SERVER_ERROR: 'Internal server error',
  DATABASE_ERROR: 'Database operation failed',
  EXTERNAL_SERVICE_ERROR: 'External service error',
  FILE_UPLOAD_ERROR: 'File upload failed',
  EMAIL_SEND_ERROR: 'Failed to send email'
} as const;

export const mapDatabaseError = (error: any, resource: string): ApiError => {
  if (error.code === "P2025") {
    return new ApiError(HTTP_STATUS.NOT_FOUND, `${resource} not found`, [], "NOT_FOUND");
  }
  if (error.code === "P2002") {
    const field = error.meta?.target as string[] | undefined;
    if (field?.includes("email")) {
      return new ApiError(HTTP_STATUS.CONFLICT, "Email already exists", [], "EMAIL_EXISTS");
    }
    if (field?.includes("username")) {
      return new ApiError(HTTP_STATUS.CONFLICT, "Username already exists", [], "USERNAME_EXISTS");
    }
    if (field?.includes("enrollment_id")) {
      return new ApiError(HTTP_STATUS.CONFLICT, "Enrollment ID already exists", [], "ENROLLMENT_ID_EXISTS");
    }
    return new ApiError(HTTP_STATUS.CONFLICT, "Duplicate entry found", [], "DUPLICATE_ENTRY");
  }
  if (error.code === "P2003") {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid foreign key reference", [], "INVALID_REFERENCE");
  }
  return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Database operation failed", [], "DATABASE_ERROR");
};

export const getUserFriendlyMessage = (statusCode: number, message: string, code?: string): string => {
  // First check if we have a specific mapping for the error code
  if (code) {
    const codeMessage = ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES];
    if (codeMessage) return codeMessage;
  }
  
  // Fall back to status code based messages
  switch (statusCode) {
    case HTTP_STATUS.BAD_REQUEST:
      return ERROR_MESSAGES.BAD_REQUEST;
    case HTTP_STATUS.UNAUTHORIZED:
      return ERROR_MESSAGES.UNAUTHORIZED;
    case HTTP_STATUS.FORBIDDEN:
      return ERROR_MESSAGES.FORBIDDEN;
    case HTTP_STATUS.NOT_FOUND:
      return ERROR_MESSAGES.NOT_FOUND;
    case HTTP_STATUS.CONFLICT:
      return ERROR_MESSAGES.CONFLICT;
    case HTTP_STATUS.UNPROCESSABLE_ENTITY:
      return ERROR_MESSAGES.UNPROCESSABLE_ENTITY;
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      return ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
    default:
      return message || 'An error occurred';
  }
};
