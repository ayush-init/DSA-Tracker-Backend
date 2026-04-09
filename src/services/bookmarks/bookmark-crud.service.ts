import prisma from "../../config/prisma";
import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from '../../utils/errorMapper';

export const addBookmarkService = async (
  studentId: number,
  questionId: number,
  description?: string
) => {
  try {
    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Student not found");
    }

    // Check if question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Question not found");
    }

    // Check if already bookmarked
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        student_id_question_id: {
          student_id: studentId,
          question_id: questionId
        }
      }
    });

    if (existingBookmark) {
      throw new ApiError(HTTP_STATUS.CONFLICT, "Question already bookmarked");
    }

    // Create bookmark
    const bookmark = await prisma.bookmark.create({
      data: {
        student_id: studentId,
        question_id: questionId,
        description: description || null
      },
      select: {
        id: true,
        question_id: true,
        description: true,
        created_at: true
      }
    });

    return bookmark;

  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ApiError(HTTP_STATUS.CONFLICT, "Question already bookmarked");
      }
      if (error.code === "P2003") {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid student or question reference");
      }
      if (error.code === "P2025") {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Student or question not found");
      }
    }
    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to add bookmark");
  }
};

export const updateBookmarkService = async (
  studentId: number,
  questionId: number,
  description: string
) => {
  try {
    // Check if bookmark exists
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        student_id_question_id: {
          student_id: studentId,
          question_id: questionId
        }
      }
    });

    if (!existingBookmark) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Bookmark not found");
    }

    // Update bookmark
    const bookmark = await prisma.bookmark.update({
      where: {
        student_id_question_id: {
          student_id: studentId,
          question_id: questionId
        }
      },
      data: {
        description,
        updated_at: new Date()
      },
      select: {
        id: true,
        question_id: true,
        description: true,
        created_at: true,
        updated_at: true
      }
    });

    return bookmark;

  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Bookmark not found");
      }
    }
    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to update bookmark");
  }
};

export const deleteBookmarkService = async (
  studentId: number,
  questionId: number
) => {
  try {
    // Check if bookmark exists
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        student_id_question_id: {
          student_id: studentId,
          question_id: questionId
        }
      }
    });

    if (!existingBookmark) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Bookmark not found");
    }

    // Delete bookmark
    await prisma.bookmark.delete({
      where: {
        student_id_question_id: {
          student_id: studentId,
          question_id: questionId
        }
      }
    });

    return true;

  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Bookmark not found");
      }
    }
    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to delete bookmark");
  }
};
