import { Request, Response } from "express";
import { getBookmarksService } from "../services/bookmarks/bookmark-query.service";
import {
  addBookmarkService,
  updateBookmarkService,
  deleteBookmarkService,
} from "../services/bookmarks/bookmark-crud.service";
import { ApiError } from "../utils/ApiError";
import { CacheInvalidation } from "../utils/cacheInvalidation";
import { ExtendedRequest } from "../types";
import { asyncHandler } from "../utils/asyncHandler";
import { bookmarkQuerySchema } from "../schemas/bookmark.schema";
import { z } from "zod";

type BookmarkQuery = z.infer<typeof bookmarkQuerySchema>;

// ==============================
// GET ALL BOOKMARKS
// ==============================

export const getBookmarks = asyncHandler(async (req: ExtendedRequest, res: Response) => {
  const student = req.student;
  
  if (!student) {
    console.error('[BOOKMARK CONTROLLER] Student is missing from request');
    throw new ApiError(401, "Authentication required - student information missing");
  }

  // Query params already validated and transformed by Zod middleware
  // req.query is now typed as BookmarkQuery after validation
  const query = req.query as unknown as BookmarkQuery;
  
  console.log('[BOOKMARK CONTROLLER] Student ID:', student.id, 'Type:', typeof student.id);
  console.log('[BOOKMARK CONTROLLER] Validated query:', query);
  console.log('[BOOKMARK CONTROLLER] Query types:', {
    page: typeof query.page,
    limit: typeof query.limit,
    sort: query.sort,
    filter: query.filter
  });

  try {
    // Ensure student.id is a number (JWT may preserve it as number, but let's be safe)
    const studentId = typeof student.id === 'string' ? parseInt(student.id, 10) : student.id;
    
    const result = await getBookmarksService(studentId, {
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      filter: query.filter
    });
    
    console.log('[BOOKMARK CONTROLLER] Service returned successfully');

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[BOOKMARK CONTROLLER] Error occurred:', error);
    throw error;
  }
});

// ==============================
// ADD BOOKMARK
// ==============================

export const addBookmark = asyncHandler(async (req: ExtendedRequest, res: Response) => {
  const student = req.student;
  if (!student) {
    throw new ApiError(401, "Authentication required - student information missing");
  }
  
  // Body already validated by Zod middleware
  const { question_id, description } = req.body;

  const bookmark = await addBookmarkService(student.id, question_id, description);

  // Invalidate bookmark cache for this student
  await CacheInvalidation.invalidateBookmarksForStudent(student.id);
  // Invalidate assigned questions cache since isBookmarked field changes
  await CacheInvalidation.invalidateAssignedQuestionsForStudent(student.id);
  // Invalidate class progress cache since isBookmarked field changes
  await CacheInvalidation.invalidateClassProgressForStudent(student.id);

  res.status(201).json({
    success: true,
    data: bookmark
  });
});

// ==============================
// UPDATE BOOKMARK
// ==============================

export const updateBookmark = asyncHandler(async (req: ExtendedRequest, res: Response) => {
  const student = req.student;
  if (!student) {
    throw new ApiError(401, "Authentication required - student information missing");
  }
  
  // Params and body already validated by Zod middleware
  const { questionId } = req.params as unknown as { questionId: number };
  const { description } = req.body;

  const bookmark = await updateBookmarkService(student.id, questionId, description);

  // Invalidate bookmark cache for this student
  await CacheInvalidation.invalidateBookmarksForStudent(student.id);
  // Invalidate assigned questions cache since isBookmarked field changes
  await CacheInvalidation.invalidateAssignedQuestionsForStudent(student.id);
  // Invalidate class progress cache since isBookmarked field changes
  await CacheInvalidation.invalidateClassProgressForStudent(student.id);

  res.status(200).json({
    success: true,
    data: bookmark
  });
});

// ==============================
// DELETE BOOKMARK
// ==============================

export const deleteBookmark = asyncHandler(async (req: ExtendedRequest, res: Response) => {
  const student = req.student;
  if (!student) {
    throw new ApiError(401, "Authentication required - student information missing");
  }
  
  // Params already validated by Zod middleware
  const { questionId } = req.params as unknown as { questionId: number };

  await deleteBookmarkService(student.id, questionId);

  // Invalidate bookmark cache for this student
  await CacheInvalidation.invalidateBookmarksForStudent(student.id);
  // Invalidate assigned questions cache since isBookmarked field changes
  await CacheInvalidation.invalidateAssignedQuestionsForStudent(student.id);
  // Invalidate class progress cache since isBookmarked field changes
  await CacheInvalidation.invalidateClassProgressForStudent(student.id);

  res.status(200).json({
    success: true,
    message: "Bookmark deleted successfully"
  });
});