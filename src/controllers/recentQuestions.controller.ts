import { Request, Response } from "express";
import { getRecentQuestionsService } from "../services/recentQuestions.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const getRecentQuestions = asyncHandler(async (req: Request, res: Response) => {
          try {
            // Get batch info from middleware (extractStudentInfo)
            const batchId = (req as any).batchId;
            const { days } = req.query;

            if (!batchId) {
              throw new ApiError(401, "Student authentication required", [], "UNAUTHORIZED");
            }

            // Parse days parameter (default to 7)
            const daysParam = days ? parseInt(days as string) : 7;
            if (isNaN(daysParam) || daysParam < 1 || daysParam > 30) {
              throw new ApiError(400, "Days parameter must be a number between 1 and 30", [], "INVALID_INPUT");
            }

            const questions = await getRecentQuestionsService({
              batchId,
              days: daysParam
            });

            return res.json({
              questions,
              total: questions.length
            });

          } catch (error: any) {
    if (error instanceof ApiError) throw error;
            throw new ApiError(500, error.message || "Failed to fetch recent questions", [], "INTERNAL_SERVER_ERROR");
          }
        });
