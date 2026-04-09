import { Request, Response } from "express";
import { assignQuestionsToClassService, removeQuestionFromClassService, updateQuestionVisibilityTypeService } from "../services/questions/visibility.service";
import { getAssignedQuestionsOfClassService } from "../services/questions/visibility-query.service";
import { getAllQuestionsWithFiltersService } from "../services/questions/visibility-student.service";
import { validateSlugParams, validateRequiredSlugParams, validateQuestionAssignments, parsePaginationParams } from "../services/questions/visibility-validation.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ExtendedRequest } from "../types";

export const assignQuestionsToClass = asyncHandler(async (
          req: ExtendedRequest,
          res: Response
        ) => {
            const batch = req.batch;
            if (!batch) {
              throw new ApiError(401, "Authentication required - batch information missing");
            }
            
            const topicSlugParam = req.params.topicSlug;
            const classSlug = req.params.classSlug;
            const { questions } = req.body;

            // Validate slugs and question assignments
            const { topicSlug, classSlug: validatedClassSlug } = validateRequiredSlugParams(topicSlugParam, classSlug);
            const validatedQuestions = validateQuestionAssignments(questions);

            const result = await assignQuestionsToClassService({
              batchId: batch.id,
              topicSlug: topicSlug,
              classSlug: validatedClassSlug,
              questions: validatedQuestions,
            });

            return res.json({
              message: "Questions assigned successfully",
              ...result,
            });
        });

export const getAssignedQuestionsOfClass = asyncHandler(async (
          req: ExtendedRequest,
          res: Response
        ) => {
            const batch = req.batch;
            if (!batch) {
              throw new ApiError(401, "Authentication required - batch information missing");
            }
            
            const topicSlugParam = req.params.topicSlug;
            const classSlugParam = req.params.classSlug;

            // Validate slugs and parse pagination
            const { topicSlug, classSlug } = validateRequiredSlugParams(topicSlugParam, classSlugParam);
            const pagination = parsePaginationParams(req.query);

            const assigned = await getAssignedQuestionsOfClassService({
              batchId: batch.id,
              topicSlug: topicSlug,
              classSlug: classSlug,
              page: pagination.page,
              limit: pagination.limit,
              search: pagination.search || '',
            });

            return res.json({
              message: "Assigned questions retrieved successfully",
              data: assigned.data,
              pagination: assigned.pagination,
            });
        });


export const removeQuestionFromClass = asyncHandler(async (
          req: ExtendedRequest,
          res: Response
        ) => {
            const batch = req.batch;
            if (!batch) {
              throw new ApiError(401, "Authentication required - batch information missing");
            }
            
            const topicSlugParam = req.params.topicSlug;
            const classSlugParam = req.params.classSlug;
            const questionIdParam = req.params.questionId;
            
            // Validate slugs and question ID
            const { topicSlug, classSlug } = validateRequiredSlugParams(topicSlugParam, classSlugParam);
            const questionId = typeof questionIdParam === "string" ? parseInt(questionIdParam) : undefined;
            
            if (!questionId || isNaN(questionId) || questionId <= 0) {
              throw new ApiError(400, "Invalid question ID", [], "INVALID_INPUT");
            }

            await removeQuestionFromClassService({
              batchId: batch.id,
              topicSlug: topicSlug,
              classSlug: classSlug,
              questionId: questionId,
            });

            return res.json({
              message: "Question removed successfully",
            });
        });

// Student-specific controller - get all questions with filters for student's batch
export const getAllQuestionsWithFilters = asyncHandler(async (req: ExtendedRequest, res: Response) => {
            // Get student info from middleware (extractStudentInfo)
            const student = req.student;
            const batchId = req.batchId;
            
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
        });

// Update question visibility type (homework/classwork)
export const updateQuestionVisibilityType = asyncHandler(async (
          req: ExtendedRequest,
          res: Response
        ) => {
            const batch = req.batch;
            if (!batch) {
              throw new ApiError(401, "Authentication required - batch information missing");
            }
            
            const topicSlugParam = req.params.topicSlug;
            const classSlugParam = req.params.classSlug;
            const visibilityIdParam = req.params.visibilityId;

            // Validate slugs and visibility ID
            const { topicSlug, classSlug } = validateRequiredSlugParams(topicSlugParam, classSlugParam);
            
            if (typeof visibilityIdParam !== "string") {
              throw new ApiError(400, "Invalid visibility ID", [], "INVALID_INPUT");
            }
            
            const visibilityId = parseInt(visibilityIdParam);
            if (isNaN(visibilityId)) {
              throw new ApiError(400, "Invalid visibility ID", [], "INVALID_INPUT");
            }

            const { type } = req.body;

            if (!type || (type !== 'HOMEWORK' && type !== 'CLASSWORK')) {
              throw new ApiError(400, "Type must be HOMEWORK or CLASSWORK", [], "INVALID_INPUT");
            }

            const updated = await updateQuestionVisibilityTypeService({
              batchId: batch.id,
              topicSlug: topicSlugParam as string,
              classSlug: classSlugParam as string,
              visibilityId,
              type
            });

            return res.json({
              message: "Question visibility type updated successfully",
              data: updated
            });
        });