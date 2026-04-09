import { Request, Response } from "express";
import { getRecentQuestionsService } from "../services/questions/recentQuestions.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ExtendedRequest } from "../types";

export const getRecentQuestions = asyncHandler(async (req: ExtendedRequest, res: Response) => {
            // Get batch info from middleware (extractStudentInfo)
            const batchId = req.batchId;
            const { date, page, limit } = req.query;

            if (!batchId) {
              throw new ApiError(401, "Student authentication required", [], "UNAUTHORIZED");
            }

            // Validate date parameter (format: YYYY-MM-DD)
            let dateParam: string | undefined;
            if (date) {
              const dateStr = date as string;
              const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
              if (!dateRegex.test(dateStr)) {
                throw new ApiError(400, "Date parameter must be in YYYY-MM-DD format", [], "INVALID_INPUT");
              }

              // Validate if it's a valid date
              const parsedDate = new Date(dateStr);
              if (isNaN(parsedDate.getTime())) {
                throw new ApiError(400, "Invalid date provided", [], "INVALID_INPUT");
              }

              dateParam = dateStr;
            }

            // Parse pagination params
            const pageParam = page ? parseInt(page as string, 10) : undefined;
            const limitParam = limit ? parseInt(limit as string, 10) : undefined;

            const result = await getRecentQuestionsService({
              batchId,
              date: dateParam,
              page: pageParam,
              limit: limitParam
            });

            return res.json(result);
        });
