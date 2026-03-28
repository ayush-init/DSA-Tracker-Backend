import { Request, Response } from "express";
import prisma from "../config/prisma";
import { createTopicService, deleteTopicService, getAllTopicsService, getTopicsForBatchService, updateTopicService, getTopicsWithBatchProgressService, getTopicOverviewWithClassesSummaryService } from "../services/topic.service";
import { upload } from "../middlewares/upload.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const createTopic = asyncHandler(async (
  req: Request,
  res: Response
) => {
  console.log("Create Topic req.body:", req.body);
  const topic_name = req.body?.topic_name;
  const photo = req.file;

  if (!topic_name) {
    throw new ApiError(400, "Topic name required");
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
    throw new ApiError(400, "Topic name required");
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

export const createTopicsBulk = asyncHandler(async (req: Request, res: Response) => {
  const { topics } = req.body;

  if (!topics || !Array.isArray(topics)) {
    throw new ApiError(400, "Topics must be an array");
  }

  // Slug generate helper
  const generateSlug = (name: string) =>
    name.toLowerCase().trim().replace(/\s+/g, "-");

  const formattedTopics = topics.map((topic_name: string) => ({
    topic_name,
    slug: generateSlug(topic_name),
  }));

  const created = await prisma.topic.createMany({
    data: formattedTopics,
    skipDuplicates: true, // ignore duplicates
  });

  return res.status(201).json({
    message: "Topics uploaded successfully",
    count: created.count,
  });
});

// Student-specific controller - get topics with batch progress
export const getTopicsWithBatchProgress = asyncHandler(async (req: Request, res: Response) => {
  // Get student info from middleware (extractStudentInfo)
  const student = (req as any).student;
  const batchId = (req as any).batchId;
  
  const studentId = student?.id;

  if (!studentId || !batchId) {
    throw new ApiError(400, "Student authentication required");
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
    throw new ApiError(400, "Student authentication and topic slug required");
  }

  const topicOverview = await getTopicOverviewWithClassesSummaryService({
    studentId,
    batchId,
    topicSlug: slug,
    query: req.query,
  });

  return res.json(topicOverview);
});

export const getTopicProgressByUsername = asyncHandler(async (
  req: Request,
  res: Response
) => {
  const { username } = req.params;
  const { sortBy = 'solved' }: { sortBy?: string } = req.query;

  // Find the student by username
  const student = await prisma.student.findUnique({
    where: { username: username as string },
    include: {
      batch: true
    }
  });

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  // Get student progress to calculate solved questions
  const studentProgress = await prisma.studentProgress.findMany({
    where: { student_id: student.id }
  });

  // Get all topics with their classes
  const topics = await prisma.topic.findMany({
    include: {
      classes: {
        where: {
          batch_id: student.batch_id || undefined
        },
        include: {
          questionVisibility: true
        }
      }
    }
  });

  // Calculate progress for each topic
  const topicProgress = topics.map((topic: any) => {
    let totalAssigned = 0;
    let totalSolved = 0;

    topic.classes.forEach((cls: any) => {
      cls.questionVisibility.forEach((qv: any) => {
        totalAssigned += 1;
        
        // Check if student solved this question
        const isSolved = studentProgress.some((sp: any) => 
          sp.question_id === qv.question_id
        );
        
        if (isSolved) {
          totalSolved += 1;
        }
      });
    });

    return {
      id: topic.id,
      topic_name: topic.topic_name,
      slug: topic.slug,
      photo_url: topic.photo_url,
      totalAssigned,
      totalSolved
    };
  });

  // Sort topics based on query parameter
  const sortedTopics = topicProgress.sort((a: any, b: any) => {
    switch (sortBy) {
      case 'name':
        return a.topic_name.localeCompare(b.topic_name);
      case 'assigned':
        return b.totalAssigned - a.totalAssigned;
      case 'solved':
      default:
        return b.totalSolved - a.totalSolved;
    }
  });

  return res.json({
    username,
    studentName: student.name,
    batchName: student.batch?.batch_name || 'Unknown',
    topics: sortedTopics,
    totalTopics: topics.length,
    totalAssigned: topicProgress.reduce((sum: number, topic: any) => sum + topic.totalAssigned, 0),
    totalSolved: topicProgress.reduce((sum: number, topic: any) => sum + topic.totalSolved, 0)
  });
});