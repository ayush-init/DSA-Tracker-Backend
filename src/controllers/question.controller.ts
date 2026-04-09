/**
 * Question Controller - Question management and bulk operations
 * Handles CRUD operations for questions, bulk CSV uploads, and assignment management
 * Consolidates question functionality from multiple controllers for better organization
 */

import { Request, Response } from "express";

import { createQuestionService, updateQuestionService, deleteQuestionService } from "../services/questions/question-core.service";
import { getAllQuestionsService, getAssignedQuestionsService } from "../services/questions/question-query.service";
import { detectPlatform } from "../services/questions/question-utils.service";
import { bulkUploadQuestionsService } from "../services/questions/questionBulk.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const createQuestion = asyncHandler(async (
          req: Request,
          res: Response
        ) => {
          const question = await createQuestionService(req.body);

          return res.status(201).json({
            message: "Question created successfully",
            question,
          });
        });


export const getAllQuestions = asyncHandler(async (
          req: Request,
          res: Response
        ) => {
          const {
            topicSlug,
            level,
            platform,
            search,
            page,
            limit,
          } = req.query;

          const result = await getAllQuestionsService({
            topicSlug: topicSlug as string | undefined,
            level: level as string | undefined,
            platform: platform as string | undefined,
            search: search as string | undefined,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 10,
          });

          return res.json(result);
        });


export const updateQuestion = asyncHandler(async (
          req: Request,
          res: Response
        ) => {
          const { id } = req.params;

          const updated = await updateQuestionService({
            id: Number(id),
            ...req.body,
          });

          return res.json({
            message: "Question updated successfully",
            question: updated,
          });
        });

export const deleteQuestion = asyncHandler(async (
          req: Request,
          res: Response
        ) => {
          const { id } = req.params;

          await deleteQuestionService({
            id: Number(id),
          });

          return res.json({
            message: "Question deleted successfully",
          });
        });





export const getAssignedQuestionsController = asyncHandler(async (
          req: Request,
          res: Response
        ) => {
          const data = await getAssignedQuestionsService(req.query);

          return res.status(200).json({
            success: true,
            data
          });
        });

export const bulkUploadQuestions = asyncHandler(async (
          req: Request,
          res: Response
        ) => {
            if (!req.file) {
              throw new ApiError(400, "CSV file is required");
            }

            const { topic_id } = req.body;

            if (!topic_id || topic_id === "undefined" || topic_id === "null") {
              throw new ApiError(400, "Topic is required");
            }

            const parsedTopicId = Number(topic_id);
            if (isNaN(parsedTopicId) || parsedTopicId <= 0) {
              throw new ApiError(400, "Invalid Topic ID");
            }

            const result = await bulkUploadQuestionsService(
              req.file.buffer,
              parsedTopicId
            );

            return res.json({
              message: "Bulk upload successful",
              ...result,
            });
        });