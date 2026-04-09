import { Request, Response } from "express";
import prisma from "../config/prisma";
import { createTopicService, deleteTopicService, updateTopicService, createTopicsBulkService } from "../services/topics/topic.service";
import { getAllTopicsService, getTopicsForBatchService, getPaginatedTopicsService } from "../services/topics/topic-query.service";
import { getTopicsWithBatchProgressService, getTopicOverviewWithClassesSummaryService, getTopicProgressByUsernameService } from "../services/topics/topic-progress.service";
import { upload } from "../middlewares/upload.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { generateSlug } from "../utils/slugify";
import { detectPlatform } from "../services/questions/question-utils.service";
import { ExtendedRequest } from "../types";
export const createTopic = asyncHandler(async (
  req: Request,
  res: Response
) => {
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
  req: ExtendedRequest,
  res: Response
) => {
  const batch = req.batch;
  if (!batch) {
    throw new ApiError(401, "Authentication required - batch information missing");
  }

  const data = await getTopicsForBatchService({
    batchId: batch.id,
    query: req.query
  });

  return res.json(data);
});

export const updateTopic = asyncHandler(async (req: Request, res: Response) => {
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
export const getTopicsWithBatchProgress = asyncHandler(async (req: ExtendedRequest, res: Response) => {
  // Get student info from middleware (extractStudentInfo)
  const student = req.student;
  const batchId = req.batchId;

  const studentId = student?.id;

  if (!studentId || !batchId) {
    throw new ApiError(401, "Student authentication required", [], "UNAUTHORIZED");
  }

  const topics = await getTopicsWithBatchProgressService({
    studentId,
    batchId,
    query: req.query,
  });

  return res.json(topics);
});

// Student-specific controller - get topic overview with classes summary
export const getTopicOverviewWithClassesSummary = asyncHandler(async (req: ExtendedRequest, res: Response) => {
  // Get student info from middleware (extractStudentInfo)
  const student = req.student;
  const studentId = student?.id;
  const batchId = req.batchId;
  const topicSlug = req.params.topicSlug;

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

  // Format topics with slugs - handle both string and object formats
  const formattedTopics = topics.map((topic: any) => {
    const topicName = typeof topic === 'string' ? topic : topic.topic_name;
    
    if (!topicName) {
      throw new ApiError(400, "Each topic must have a topic_name", [], "REQUIRED_FIELD");
    }
    
    return {
      topic_name: topicName,
      slug: generateSlug(topicName),
    };
  });

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

// Get paginated topics for dropdown
export const getPaginatedTopics = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 6;
  const search = (req.query.search as string) || '';

  const result = await getPaginatedTopicsService({ page, limit, search });

  return res.json(result);
});


export const bulkTestUploadQuestions = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;

  if (!file) {
    throw new ApiError(400, "CSV file is required", [], "REQUIRED_FIELD");
  }

  // Parse CSV file
  const csv = require('csv-parser');
  const results: any[] = [];
  
  await new Promise((resolve, reject) => {
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(file.buffer);
    
    bufferStream
      .pipe(csv())
      .on('data', (data: any) => results.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  if (results.length === 0) {
    throw new ApiError(400, "CSV file is empty or invalid", [], "INVALID_FILE");
  }

  // Validate required columns
  const requiredColumns = ['question_name', 'question_link', 'level', 'topic_slug'];
  const csvColumns = Object.keys(results[0]);
  
  const missingColumns = requiredColumns.filter(col => !csvColumns.includes(col));
  if (missingColumns.length > 0) {
    throw new ApiError(400, `Missing required columns: ${missingColumns.join(', ')}`, [], "MISSING_COLUMNS");
  }

  // Validate and format each question
  const validatedQuestions = results.map((row: any, index: number) => {
    const { question_name, question_link, level, topic_slug } = row;

    if (!question_name || !question_name.trim()) {
      throw new ApiError(400, `Row ${index + 2}: question_name is required`, [], "REQUIRED_FIELD");
    }
    if (!question_link || !question_link.trim()) {
      throw new ApiError(400, `Row ${index + 2}: question_link is required`, [], "REQUIRED_FIELD");
    }
    if (!level || !['EASY', 'MEDIUM', 'HARD'].includes(level.toUpperCase().trim())) {
      throw new ApiError(400, `Row ${index + 2}: level must be EASY, MEDIUM, or HARD`, [], "INVALID_VALUE");
    }
    if (!topic_slug || !topic_slug.trim()) {
      throw new ApiError(400, `Row ${index + 2}: topic_slug is required`, [], "REQUIRED_FIELD");
    }

    return {
      question_name: question_name.trim(),
      question_link: question_link.trim(),
      level: level.toUpperCase().trim() as 'EASY' | 'MEDIUM' | 'HARD',
      topic_slug: topic_slug.trim(),
    };
  });

  // Find topic IDs for the given slugs
  const topicSlugs = [...new Set(validatedQuestions.map(q => q.topic_slug))];
  const topics = await prisma.topic.findMany({
    where: { slug: { in: topicSlugs } },
    select: { id: true, slug: true }
  });

  const topicMap = new Map(topics.map(t => [t.slug, t.id]));

  // Check if all topic slugs exist
  const missingSlugs = topicSlugs.filter(slug => !topicMap.has(slug));
  if (missingSlugs.length > 0) {
    throw new ApiError(400, `Invalid topic slugs: ${missingSlugs.join(', ')}`, [], "INVALID_TOPIC");
  }

  // Create questions with topic IDs and detected platform
  const questionsData = validatedQuestions.map(q => ({
    question_name: q.question_name,
    question_link: q.question_link,
    level: q.level,
    topic_id: topicMap.get(q.topic_slug)!, // We know this exists after validation
    platform: detectPlatform(q.question_link), // Detect platform from question link
  }));

  const created = await prisma.question.createMany({
    data: questionsData,
    skipDuplicates: true,
  });

  return res.status(201).json({
    message: "Questions created successfully",
    created: created,
    total: questionsData.length,
    processed: results.length,
  });
});









