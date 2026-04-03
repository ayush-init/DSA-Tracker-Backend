import { Request, Response } from "express";
import prisma from "../config/prisma";
import { createTopicService, deleteTopicService, getAllTopicsService, getTopicsForBatchService, updateTopicService, getTopicsWithBatchProgressService, getTopicOverviewWithClassesSummaryService, getTopicProgressByUsernameService, createTopicsBulkService } from "../services/topic.service";
import { upload } from "../middlewares/upload.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { generateSlug } from "../utils/slugify";

export const createTopic = asyncHandler(async (
  req: Request,
  res: Response
) => {
  console.log("Create Topic req.body:", req.body);
  const topic_name = req.body?.topic_name;
  const photo = req.file;

  if (!topic_name) {
    throw new ApiError(400, "Topic name required", [], "REQUIRED_FIELD");
  }

  const topic = await createTopicService({ topic_name, photo });

  return res.status(201).json({
    message: "Topic created successfully",
    topic,
  });
});

// Get All Topics
export const getAllTopics = asyncHandler(async (_req: Request, res: Response) => {
  const topics = await getAllTopicsService();
  return res.json(topics);
});

export const getTopicsForBatch = asyncHandler(async (
  req: Request,
  res: Response
) => {
  const batch = (req as any).batch;

  const data = await getTopicsForBatchService({
    batchId: batch.id,
    query: req.query
  });

  return res.json(data);
});

export const updateTopic = asyncHandler(async (req: Request, res: Response) => {
  console.log("Update Topic req.body:", req.body);
  const topicSlug = req.params.topicSlug as string;
  const topic_name = req.body?.topic_name;
  const removePhoto = req.body?.removePhoto;
  const photo = req.file;

  if (!topic_name) {
    throw new ApiError(400, "Topic name required", [], "REQUIRED_FIELD");
  }

  const topic = await updateTopicService({
    topicSlug,
    topic_name,
    photo,
    removePhoto: removePhoto === 'true' || removePhoto === true,
  });

  return res.json({
    message: "Topic updated successfully",
    topic,
  });
});

export const deleteTopic = asyncHandler(async (req: Request, res: Response) => {
  const topicSlug = req.params.topicSlug as string;

  await deleteTopicService({
    topicSlug,
  });

  return res.json({
    message: "Topic deleted successfully",
  });
});



// Student-specific controller - get topics with batch progress
export const getTopicsWithBatchProgress = asyncHandler(async (req: Request, res: Response) => {
  // Get student info from middleware (extractStudentInfo)
  const student = (req as any).student;
  const batchId = (req as any).batchId;

  const studentId = student?.id;

  if (!studentId || !batchId) {
    throw new ApiError(401, "Student authentication required", [], "UNAUTHORIZED");
  }

  const topics = await getTopicsWithBatchProgressService({
    studentId,
    batchId,
  });

  return res.json(topics);
});

// Student-specific controller - get topic overview with classes summary
export const getTopicOverviewWithClassesSummary = asyncHandler(async (req: Request, res: Response) => {
  // Get student info from middleware (extractStudentInfo)
  const student = (req as any).student;
  const batchId = (req as any).batchId;
  const { topicSlug } = req.params;

  const studentId = student?.id;

  // Ensure topicSlug is a string (not string array)
  const slug = Array.isArray(topicSlug) ? topicSlug[0] : topicSlug;

  if (!studentId || !batchId || !slug) {
    throw new ApiError(400, "Student authentication and topic slug required", [], "REQUIRED_FIELD");
  }

  const topicOverview = await getTopicOverviewWithClassesSummaryService({
    studentId,
    batchId,
    topicSlug: slug,
    query: req.query,
  });

  return res.json(topicOverview);
});

export const createTopicsBulk = asyncHandler(async (req: Request, res: Response) => {
  const { topics } = req.body;

  if (!topics || !Array.isArray(topics)) {
    throw new ApiError(400, "Topics array is required", [], "REQUIRED_FIELD");
  }

  // Format topics with slugs
  const formattedTopics = topics.map((topic: any) => ({
    topic_name: topic.topic_name,
    slug: generateSlug(topic.topic_name),
  }));

  const created = await createTopicsBulkService(formattedTopics);

  return res.status(201).json({
    message: "Topics created successfully",
    created: created,
  });
});

// Update the getTopicProgressByUsername function:
export const getTopicProgressByUsername = asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.params;
  const { sortBy = 'solved' }: { sortBy?: string } = req.query;
  // ✅ Add validation and type assertion
  if (!username || Array.isArray(username)) {
    throw new ApiError(400, "Valid username is required", [], "REQUIRED_FIELD");
  }
  const result = await getTopicProgressByUsernameService(username);

  // Sort topics based on sortBy parameter
  let sortedTopics = result.topics;
  if (sortBy === 'solved') {
    sortedTopics.sort((a, b) => b.solvedQuestions - a.solvedQuestions);
  } else if (sortBy === 'progress') {
    sortedTopics.sort((a, b) => b.progressPercentage - a.progressPercentage);
  }

  return res.status(200).json({
    success: true,
    student: result.student,
    topics: sortedTopics,
  });
});