import { Request, Response } from "express";
import { bulkUploadQuestionsService } from "../services/questionBulk.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const bulkUploadQuestions = asyncHandler(async (
          req: Request,
          res: Response
        ) => {
          try {
            if (!req.file) {
              throw new ApiError(400, "CSV file is required",);
            }

            const { topic_id } = req.body;

            if (!topic_id || topic_id === "undefined" || topic_id === "null") {
              throw new ApiError(400, "Topic  is required");
            }

            const parsedTopicId = Number(topic_id);
            if (isNaN(parsedTopicId) || parsedTopicId <= 0) {
              throw new ApiError(400, "Invalid Topic x    ");
            }

            const result = await bulkUploadQuestionsService(
              req.file.buffer,
              parsedTopicId
            );

            return res.json({
              message: "Bulk upload successful",
              ...result,
            });

          } catch (error: any) {
    if (error instanceof ApiError) throw error;
            throw new ApiError(400, error.message,);
          }
        });