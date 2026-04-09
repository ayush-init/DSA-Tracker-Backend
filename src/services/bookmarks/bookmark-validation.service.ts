import { ApiError } from "../../utils/ApiError";

export interface BookmarkQueryParams {
  page?: number;
  limit?: number;
  sort?: 'recent' | 'old' | 'solved' | 'unsolved';
  filter?: 'all' | 'solved' | 'unsolved';
}

export interface BookmarkCreateData {
  question_id: number;
  description?: string;
}

export const validateBookmarkQueryParams = (query: any): Required<BookmarkQueryParams> => {
  const { page = 1, limit = 10, sort = 'recent', filter = 'all' } = query;

  // Validate sort parameter
  const validSorts = ['recent', 'old', 'solved', 'unsolved'];
  const sortParam = sort as string;
  if (!validSorts.includes(sortParam)) {
    throw new ApiError(400, "Invalid sort parameter", [], "INVALID_SORT");
  }

  // Validate filter parameter
  const validFilters = ['all', 'solved', 'unsolved'];
  const filterParam = filter as string;
  if (!validFilters.includes(filterParam)) {
    throw new ApiError(400, "Invalid filter parameter", [], "INVALID_FILTER");
  }

  // Validate and parse page
  const pageNum = Number(page);
  if (isNaN(pageNum) || pageNum < 1) {
    throw new ApiError(400, "Invalid page parameter", [], "INVALID_PAGE");
  }

  // Validate and parse limit
  const limitNum = Number(limit);
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    throw new ApiError(400, "Invalid limit parameter (must be between 1 and 100)", [], "INVALID_LIMIT");
  }

  return {
    page: pageNum,
    limit: limitNum,
    sort: sortParam as 'recent' | 'old' | 'solved' | 'unsolved',
    filter: filterParam as 'all' | 'solved' | 'unsolved'
  };
};

export const validateBookmarkCreateData = (body: any): BookmarkCreateData => {
  const { question_id, description } = body;

  // Validate question_id
  if (!question_id) {
    throw new ApiError(400, "Question ID is required", [], "VALIDATION_ERROR");
  }

  if (typeof question_id !== 'number') {
    throw new ApiError(400, "Question ID must be a number", [], "VALIDATION_ERROR");
  }

  if (question_id <= 0) {
    throw new ApiError(400, "Question ID must be a positive number", [], "VALIDATION_ERROR");
  }

  // Validate description (optional)
  if (description !== undefined) {
    if (typeof description !== 'string') {
      throw new ApiError(400, "Description must be a string", [], "VALIDATION_ERROR");
    }

    if (description.length > 500) {
      throw new ApiError(400, "Description must be 500 characters or less", [], "VALIDATION_ERROR");
    }
  }

  return {
    question_id,
    description: description || undefined
  };
};

export const validateBookmarkUpdateData = (body: any): Partial<BookmarkCreateData> => {
  const { question_id, description } = body;

  const updateData: Partial<BookmarkCreateData> = {};

  // Validate question_id if provided
  if (question_id !== undefined) {
    if (!question_id) {
      throw new ApiError(400, "Question ID cannot be empty", [], "VALIDATION_ERROR");
    }

    if (typeof question_id !== 'number') {
      throw new ApiError(400, "Question ID must be a number", [], "VALIDATION_ERROR");
    }

    if (question_id <= 0) {
      throw new ApiError(400, "Question ID must be a positive number", [], "VALIDATION_ERROR");
    }

    updateData.question_id = question_id;
  }

  // Validate description if provided
  if (description !== undefined) {
    if (typeof description !== 'string') {
      throw new ApiError(400, "Description must be a string", [], "VALIDATION_ERROR");
    }

    if (description.length > 500) {
      throw new ApiError(400, "Description must be 500 characters or less", [], "VALIDATION_ERROR");
    }

    updateData.description = description;
  }

  return updateData;
};
