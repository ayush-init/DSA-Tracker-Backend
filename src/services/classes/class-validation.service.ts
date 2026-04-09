import { ApiError } from "../../utils/ApiError";
import { ClassQueryParams, CreateClassDTO } from "../../types/topic.types";

// Alias for compatibility with existing code
export type ClassCreateData = CreateClassDTO;

export const validateClassQueryParams = (query: any): ClassQueryParams => {
  const {
    page = '1',
    limit = '20',
    search = ''
  } = query;

  // Validate and parse page
  const pageNum = parseInt(page as string);
  if (isNaN(pageNum) || pageNum < 1) {
    throw new ApiError(400, "Invalid page parameter", [], "INVALID_PAGE");
  }

  // Validate and parse limit
  const limitNum = parseInt(limit as string);
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    throw new ApiError(400, "Invalid limit parameter (must be between 1 and 100)", [], "INVALID_LIMIT");
  }

  return {
    page: pageNum,
    limit: limitNum,
    search: search as string
  };
};

export const validateTopicSlug = (topicSlugParam: any): string => {
  if (typeof topicSlugParam !== "string") {
    throw new ApiError(400, "Invalid topic slug", [], "INVALID_INPUT");
  }

  return topicSlugParam;
};

export const validateClassCreateData = (body: any, file?: any): ClassCreateData => {
  const {
    class_name,
    description,
    pdf_url,
    duration_minutes,
    class_date,
  } = body;

  // Validate required fields
  if (!class_name || typeof class_name !== 'string') {
    throw new ApiError(400, "Class name is required and must be a string", [], "VALIDATION_ERROR");
  }

  if (class_name.length > 100) {
    throw new ApiError(400, "Class name must be 100 characters or less", [], "VALIDATION_ERROR");
  }

  // Validate optional fields
  if (description !== undefined) {
    if (typeof description !== 'string') {
      throw new ApiError(400, "Description must be a string", [], "VALIDATION_ERROR");
    }
    if (description.length > 500) {
      throw new ApiError(400, "Description must be 500 characters or less", [], "VALIDATION_ERROR");
    }
  }

  if (pdf_url !== undefined) {
    if (typeof pdf_url !== 'string') {
      throw new ApiError(400, "PDF URL must be a string", [], "VALIDATION_ERROR");
    }
  }

  if (duration_minutes !== undefined) {
    const duration = Number(duration_minutes);
    if (isNaN(duration) || duration < 1 || duration > 480) { // Max 8 hours
      throw new ApiError(400, "Duration must be between 1 and 480 minutes", [], "VALIDATION_ERROR");
    }
  }

  if (class_date !== undefined) {
    if (typeof class_date !== 'string') {
      throw new ApiError(400, "Class date must be a string", [], "VALIDATION_ERROR");
    }
    // Basic date validation - could be enhanced with proper date parsing
    const dateObj = new Date(class_date);
    if (isNaN(dateObj.getTime())) {
      throw new ApiError(400, "Invalid date format", [], "VALIDATION_ERROR");
    }
  }

  return {
    class_name,
    description: description || undefined,
    pdf_url: pdf_url || undefined,
    pdf_file: file,
    duration_minutes: duration_minutes ? Number(duration_minutes) : undefined,
    class_date: class_date || undefined
  };
};

export const validateClassUpdateData = (body: any): Partial<ClassCreateData> => {
  const updateData: Partial<ClassCreateData> = {};

  if (body.class_name !== undefined) {
    if (!body.class_name || typeof body.class_name !== 'string') {
      throw new ApiError(400, "Class name is required and must be a string", [], "VALIDATION_ERROR");
    }
    if (body.class_name.length > 100) {
      throw new ApiError(400, "Class name must be 100 characters or less", [], "VALIDATION_ERROR");
    }
    updateData.class_name = body.class_name;
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string') {
      throw new ApiError(400, "Description must be a string", [], "VALIDATION_ERROR");
    }
    if (body.description.length > 500) {
      throw new ApiError(400, "Description must be 500 characters or less", [], "VALIDATION_ERROR");
    }
    updateData.description = body.description;
  }

  if (body.pdf_url !== undefined) {
    if (typeof body.pdf_url !== 'string') {
      throw new ApiError(400, "PDF URL must be a string", [], "VALIDATION_ERROR");
    }
    updateData.pdf_url = body.pdf_url;
  }

  if (body.duration_minutes !== undefined) {
    const duration = Number(body.duration_minutes);
    if (isNaN(duration) || duration < 1 || duration > 480) {
      throw new ApiError(400, "Duration must be between 1 and 480 minutes", [], "VALIDATION_ERROR");
    }
    updateData.duration_minutes = duration;
  }

  if (body.class_date !== undefined) {
    if (typeof body.class_date !== 'string') {
      throw new ApiError(400, "Class date must be a string", [], "VALIDATION_ERROR");
    }
    const dateObj = new Date(body.class_date);
    if (isNaN(dateObj.getTime())) {
      throw new ApiError(400, "Invalid date format", [], "VALIDATION_ERROR");
    }
    updateData.class_date = body.class_date;
  }

  return updateData;
};
