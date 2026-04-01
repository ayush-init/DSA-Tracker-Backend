import { Request, Response } from "express";
import { assignQuestionsToClassService, getAssignedQuestionsOfClassService, removeQuestionFromClassService, getAllQuestionsWithFiltersService } from "../services/questionVisibility.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const assignQuestionsToClass = asyncHandler(async (
          req: Request,
          res: Response
        ) => {
          try {
            const batch = (req as any).batch;
            const topicSlugParam = req.params.topicSlug;
            const classSlug = req.params.classSlug;

            if (typeof topicSlugParam !== "string") {
              throw new ApiError(400, "Invalid topic slug", [], "INVALID_INPUT");
            }

            if (typeof classSlug !== "string") {
              throw new ApiError(400, "Invalid class slug", [], "INVALID_INPUT");
            }

            const { question_ids } = req.body;

            // Validation 1: Check if question_ids is provided
            if (!question_ids) {
              throw new ApiError(400, "question_ids field is required", [], "REQUIRED_FIELD");
            }

            // Validation 2: Check if question_ids is an array
            if (!Array.isArray(question_ids)) {
              throw new ApiError(400, "question_ids must be an array", [], "INVALID_INPUT");
            }

            // Validation 3: Check if array is not empty
            if (question_ids.length === 0) {
              throw new ApiError(400, "question_ids array cannot be empty", [], "INVALID_INPUT");
            }

            // Validation 4: Check if all elements are numbers
            if (!question_ids.every(id => typeof id === 'number' && id > 0)) {
              throw new ApiError(400, "All question_ids must be positive numbers", [], "INVALID_INPUT");
            }

            // Validation 5: Check for duplicate question IDs in request
            const duplicateIds = question_ids.filter((id, index) => question_ids.indexOf(id) !== index);
            if (duplicateIds.length > 0) {
              throw new ApiError(400, `Duplicate question IDs found in request: ${duplicateIds.join(', ')}`, [], "INVALID_INPUT");
            }

            const result = await assignQuestionsToClassService({
              batchId: batch.id,
              topicSlug: topicSlugParam,
              classSlug,
              questionIds: question_ids,
            });

            return res.json({
              message: "Questions assigned successfully",
              ...result,
            });

          } catch (error: any) {
    if (error instanceof ApiError) throw error;
            throw new ApiError(500, error.message, [], "INTERNAL_SERVER_ERROR");
          }
        });

export const getAssignedQuestionsOfClass = asyncHandler(async (
          req: Request,
          res: Response
        ) => {
          try {
            const batch = (req as any).batch;
            const topicSlugParam = req.params.topicSlug;
            const classSlug = req.params.classSlug;

            if (typeof topicSlugParam !== "string") {
              throw new ApiError(400, "Invalid topic slug", [], "INVALID_INPUT");
            }

            if (typeof classSlug !== "string") {
              throw new ApiError(400, "Invalid class slug", [], "INVALID_INPUT");
            }

            // Extract pagination and search parameters
            const {
              page = '1',
              limit = '25',
              search = ''
            } = req.query;

            const pageNum = parseInt(page as string);
            const limitNum = parseInt(limit as string);
            const searchQuery = search as string;

            const assigned = await getAssignedQuestionsOfClassService({
              batchId: batch.id,
              topicSlug: topicSlugParam,
              classSlug,
              page: pageNum,
              limit: limitNum,
              search: searchQuery,
            });

            return res.json({
              message: "Assigned questions retrieved successfully",
              data: assigned.data,
              pagination: assigned.pagination,
            });

          } catch (error: any) {
    if (error instanceof ApiError) throw error;
            throw new ApiError(500, error.message, [], "INTERNAL_SERVER_ERROR");
          }
        });


export const removeQuestionFromClass = asyncHandler(async (
          req: Request,
          res: Response
        ) => {
          try {
            const batch = (req as any).batch;
            const topicSlugParam = req.params.topicSlug;
            const classSlug = req.params.classSlug;
            const questionIdParam = req.params.questionId;
            
            if (typeof questionIdParam !== "string") {
              throw new ApiError(400, "Invalid question ID", [], "INVALID_INPUT");
            }
            
            const questionId = parseInt(questionIdParam);

            if (typeof topicSlugParam !== "string") {
              throw new ApiError(400, "Invalid topic slug", [], "INVALID_INPUT");
            }

            if (typeof classSlug !== "string") {
              throw new ApiError(400, "Invalid class slug", [], "INVALID_INPUT");
            }

            if (isNaN(questionId)) {
              throw new ApiError(400, "Invalid question ID", [], "INVALID_INPUT");
            }

            await removeQuestionFromClassService({
              batchId: batch.id,
              topicSlug: topicSlugParam,
              classSlug,
              questionId,
            });

            return res.json({
              message: "Question removed successfully",
            });

          } catch (error: any) {
    if (error instanceof ApiError) throw error;
            throw new ApiError(500, error.message, [], "INTERNAL_SERVER_ERROR");
          }
        });

// Student-specific controller - get all questions with filters for student's batch
export const getAllQuestionsWithFilters = asyncHandler(async (req: Request, res: Response) => {
          try {
            // Get student info from middleware (extractStudentInfo)
            const student = (req as any).student;
            const batchId = (req as any).batchId;
            
            const studentId = student?.id;

            if (!studentId || !batchId) {
              throw new ApiError(400, "Student authentication required",);
            }

            // Extract query parameters for filtering
            const {
              search,
              topic,
              level,
              platform,
              type,
              solved,
              page = '1',
              limit = '20'
            } = req.query;

            const filters = {
              search: search as string,
              topic: topic as string,
              level: level as string,
              platform: platform as string,
              type: type as string,
              solved: solved as string,
              page: parseInt(page as string),
              limit: parseInt(limit as string)
            };

            const questions = await getAllQuestionsWithFiltersService({
              studentId,
              batchId,
              filters
            });

            return res.json(questions);

          } catch (error: any) {
    if (error instanceof ApiError) throw error;
            throw new ApiError(500, error.message || "Failed to fetch questions",);
          }
        });