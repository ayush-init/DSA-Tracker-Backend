import { ApiError } from "../../utils/ApiError";

export interface QuestionAssignmentData {
  question_id: number;
  type: 'HOMEWORK' | 'CLASSWORK';
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
}

export interface ClassAssignmentParams {
  batchId: number;
  topicSlug: string;
  classSlug: string;
  questions?: QuestionAssignmentData[];
  page?: number;
  limit?: number;
  search?: string;
}

export const validateQuestionAssignments = (questions: any): QuestionAssignmentData[] => {
  // Validation 1: Check if questions is provided
  if (!questions) {
    throw new ApiError(400, "questions field is required", [], "REQUIRED_FIELD");
  }

  // Validation 2: Check if questions is an array
  if (!Array.isArray(questions)) {
    throw new ApiError(400, "questions must be an array", [], "INVALID_INPUT");
  }

  // Validation 3: Check if array is not empty
  if (questions.length === 0) {
    throw new ApiError(400, "questions array cannot be empty", [], "INVALID_INPUT");
  }

  // Validation 4: Check if all elements have required fields
  if (!questions.every(q => typeof q.question_id === 'number' && q.question_id > 0 && 
                                 (q.type === 'HOMEWORK' || q.type === 'CLASSWORK'))) {
    throw new ApiError(400, "All questions must have question_id (positive number) and type (HOMEWORK or CLASSWORK)", [], "INVALID_INPUT");
  }

  // Validation 5: Check for duplicate question IDs in request
  const questionIds = questions.map(q => q.question_id);
  const duplicateIds = questionIds.filter((id, index) => questionIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new ApiError(400, `Duplicate question IDs found in request: ${duplicateIds.join(', ')}`, [], "INVALID_INPUT");
  }

  return questions as QuestionAssignmentData[];
};

export const validateSlugParams = (topicSlugParam: any, classSlugParam?: any, questionIdParam?: any) => {
  if (typeof topicSlugParam !== "string") {
    throw new ApiError(400, "Invalid topic slug", [], "INVALID_INPUT");
  }

  if (classSlugParam && typeof classSlugParam !== "string") {
    throw new ApiError(400, "Invalid class slug", [], "INVALID_INPUT");
  }

  if (questionIdParam && typeof questionIdParam !== "string") {
    throw new ApiError(400, "Invalid question ID", [], "INVALID_INPUT");
  }

  const questionId = questionIdParam ? parseInt(questionIdParam, 10) : undefined;
  if (questionId !== undefined && (isNaN(questionId) || questionId <= 0)) {
    throw new ApiError(400, "Invalid question ID", [], "INVALID_INPUT");
  }

  return {
    topicSlug: topicSlugParam as string,
    classSlug: classSlugParam as string | undefined,
    questionId: questionId as number | undefined
  };
};

export const validateRequiredSlugParams = (topicSlugParam: any, classSlugParam: any) => {
  if (typeof topicSlugParam !== "string") {
    throw new ApiError(400, "Invalid topic slug", [], "INVALID_INPUT");
  }

  if (!classSlugParam || typeof classSlugParam !== "string") {
    throw new ApiError(400, "Class slug is required", [], "INVALID_INPUT");
  }

  return {
    topicSlug: topicSlugParam as string,
    classSlug: classSlugParam as string
  };
};

export const parsePaginationParams = (query: any): PaginationParams => {
  const {
    page = '1',
    limit = '25',
    search = ''
  } = query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const searchQuery = search as string;

  if (isNaN(pageNum) || pageNum < 1) {
    throw new ApiError(400, "Invalid page parameter", [], "INVALID_INPUT");
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    throw new ApiError(400, "Invalid limit parameter (must be between 1 and 100)", [], "INVALID_INPUT");
  }

  return {
    page: pageNum,
    limit: limitNum,
    search: searchQuery
  };
};
