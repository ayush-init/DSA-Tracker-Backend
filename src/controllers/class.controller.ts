import { Request, Response } from "express";
import { createClassInTopicService, updateClassService, deleteClassService } from "../services/topics/class.service";
import { getClassesByTopicService, getClassDetailsService } from "../services/topics/class-query.service";
import { getClassDetailsWithFullQuestionsService } from "../services/topics/class-student.service";
import { validateClassQueryParams, validateTopicSlug, validateClassCreateData, validateClassUpdateData } from "../services/classes/class-validation.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ExtendedRequest } from "../types";

export const getClassesByTopic = asyncHandler(async (
          req: ExtendedRequest,
          res: Response
        ) => {
            const batch = req.batch;
            if (!batch) {
              throw new ApiError(401, "Authentication required - batch information missing");
            }

            // Validate topic slug and query parameters using service
            const topicSlug = validateTopicSlug(req.params.topicSlug);
            const queryParams = validateClassQueryParams(req.query);

            const classes = await getClassesByTopicService({
              batchId: batch.id,
              topicSlug: topicSlug,
              page: queryParams.page!,
              limit: queryParams.limit!,
              search: queryParams.search!,
            });

            return res.json(classes);
        });

export const createClassInTopic = asyncHandler(async (
          req: ExtendedRequest,
          res: Response
        ) => {
          try {
            const batch = req.batch;
            if (!batch) {
              throw new ApiError(401, "Authentication required - batch information missing");
            }

            // Validate topic slug and class data using service
            const topicSlug = validateTopicSlug(req.params.topicSlug);
            const classData = validateClassCreateData(req.body, req.file);

            if (!classData.class_name || !classData.description || !classData.pdf_url || !classData.pdf_file || !classData.duration_minutes || !classData.class_date) {
              throw new ApiError(400, "Invalid class data");
            }

            const newClass = await createClassInTopicService({
              batchId: batch.id,
              topicSlug: topicSlug,
              class_name: classData.class_name,
              description: classData.description,
              pdf_url: classData.pdf_url,
              pdf_file: classData.pdf_file,
              duration_minutes: classData.duration_minutes,
              class_date: classData.class_date
            });

            
            return res.status(201).json({
              message: "Class created successfully",
              class: newClass,
            });
          
          } catch (error: any) {
    if (error instanceof ApiError) throw error;
            throw new ApiError(400, error.message,);
          }
        });


export const getClassDetails = asyncHandler(async (
          req: ExtendedRequest,
          res: Response
        ) => {
            const batch = req.batch;
            if (!batch) {
              throw new ApiError(401, "Authentication required - batch information missing");
            }

            // Validate topic and class slugs using service
            const topicSlug = validateTopicSlug(req.params.topicSlug);
            const classSlug = validateTopicSlug(req.params.classSlug);

            const classDetails = await getClassDetailsService({
              batchId: batch.id,
              topicSlug: topicSlug,
              classSlug: classSlug,
            });

            return res.json(classDetails);
        });

export const updateClass = asyncHandler(async (
          req: ExtendedRequest,
          res: Response
        ) => {
            const batch = req.batch;
            if (!batch) {
              throw new ApiError(401, "Authentication required - batch information missing");
            }
            
            const topicSlugParam = req.params.topicSlug;
            const classSlug = req.params.classSlug;

            if (typeof topicSlugParam !== "string") {
              throw new ApiError(400, "Invalid topic slug",);
            }

            if (typeof classSlug !== "string") {
              throw new ApiError(400, "Invalid class slug",);
            }

            const updated = await updateClassService({
              batchId: batch.id,
              topicSlug: topicSlugParam,
              classSlug,
              ...req.body,
              pdf_file: req.file, // Handle PDF file upload
            });

            return res.json({
              message: "Class updated successfully",
              class: updated,
            });
        });

export const deleteClass = asyncHandler(async (
          req: ExtendedRequest,
          res: Response
        ) => {
            const batch = req.batch;
            if (!batch) {
              throw new ApiError(401, "Authentication required - batch information missing");
            }
            
            const topicSlugParam = req.params.topicSlug;
            const classSlug = req.params.classSlug;

            if (typeof topicSlugParam !== "string") {
              throw new ApiError(400, "Invalid topic slug",);
            }

            if (typeof classSlug !== "string") {
              throw new ApiError(400, "Invalid class slug",);
            }

            await deleteClassService({
              batchId: batch.id,
              topicSlug: topicSlugParam,
              classSlug,
            });

            return res.json({
              message: "Class deleted successfully",
            });
        });

// Student-specific controller - get class details with full questions array
export const getClassDetailsWithFullQuestions = asyncHandler(async (req: ExtendedRequest, res: Response) => {
            // Get student info from middleware (extractStudentInfo)
            const student = req.student;
            const batchId = req.batchId;
            const { topicSlug, classSlug } = req.params;
            
            const studentId = student?.id;
            
            // Ensure slugs are strings (not string arrays)
            const topic = Array.isArray(topicSlug) ? topicSlug[0] : topicSlug;
            const cls = Array.isArray(classSlug) ? classSlug[0] : classSlug;

            if (!studentId || !batchId || !topic || !cls) {
              throw new ApiError(400, "Student authentication and topic/class slugs required",);
            }

            const classDetails = await getClassDetailsWithFullQuestionsService({
              studentId,
              batchId,
              topicSlug: topic,
              classSlug: cls,
              query: req.query,
            });

            return res.json(classDetails);
        });
