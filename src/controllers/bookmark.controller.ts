import { Request, Response } from "express";
import { getBookmarksService } from "../services/bookmarks/bookmark-query.service";
import {
  addBookmarkService,
  updateBookmarkService,
  deleteBookmarkService,
} from "../services/bookmarks/bookmark-crud.service";
import { validateBookmarkQueryParams, validateBookmarkCreateData, validateBookmarkUpdateData } from "../services/bookmarks/bookmark-validation.service";
import { ApiError } from "../utils/ApiError";
import { ExtendedRequest } from "../types";

// ==============================
// GET ALL BOOKMARKS
// ==============================

export const getBookmarks = async (req: ExtendedRequest, res: Response) => {
  const student = req.student;
  if (!student) {
    throw new ApiError(401, "Authentication required - student information missing");
  }
  
  // Validate query parameters using service
  const queryParams = validateBookmarkQueryParams(req.query);

  const result = await getBookmarksService(student.id, queryParams);

  res.status(200).json({
    success: true,
    data: result
  });
};

// ==============================
// ADD BOOKMARK
// ==============================

export const addBookmark = async (req: ExtendedRequest, res: Response) => {
  const student = req.student;
  if (!student) {
    throw new ApiError(401, "Authentication required - student information missing");
  }
  
  // Validate bookmark data using service
  const bookmarkData = validateBookmarkCreateData(req.body);

  const bookmark = await addBookmarkService(student.id, bookmarkData.question_id, bookmarkData.description);

  res.status(201).json({
    success: true,
    data: bookmark
  });
};

// ==============================
// UPDATE BOOKMARK
// ==============================

export const updateBookmark = async (req: ExtendedRequest, res: Response) => {
  const student = req.student;
  if (!student) {
    throw new ApiError(401, "Authentication required - student information missing");
  }
  
  const { questionId } = req.params;

  // Ensure questionId is a string (not string array)
  const questionIdStr = Array.isArray(questionId) ? questionId[0] : questionId;

  // Validate question ID parameter
  if (!questionIdStr) {
    throw new ApiError(400, "Question ID is required", [], "VALIDATION_ERROR");
  }
  
  // Validate update data using service
  const updateData = validateBookmarkUpdateData(req.body);

  // For updateBookmarkService, description is required
  if (updateData.description === undefined) {
    throw new ApiError(400, "Description is required for update", [], "VALIDATION_ERROR");
  }

  const bookmark = await updateBookmarkService(student.id, Number(questionIdStr), updateData.description);

  res.status(200).json({
    success: true,
    data: bookmark
  });
};

// ==============================
// DELETE BOOKMARK
// ==============================

export const deleteBookmark = async (req: ExtendedRequest, res: Response) => {
  const student = req.student;
  if (!student) {
    throw new ApiError(401, "Authentication required - student information missing");
  }
  
  const { questionId } = req.params;

  // Ensure questionId is a string (not string array)
  const questionIdStr = Array.isArray(questionId) ? questionId[0] : questionId;

  // Validation
  if (!questionIdStr || isNaN(parseInt(questionIdStr))) {
    throw new ApiError(400, "Invalid question ID");
  }

  await deleteBookmarkService(student.id, parseInt(questionIdStr));

  res.status(200).json({
    success: true,
    message: "Bookmark deleted successfully"
  });
};
