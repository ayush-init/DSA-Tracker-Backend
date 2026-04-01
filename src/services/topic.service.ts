import prisma from "../config/prisma";
import { slugify } from "transliteration";
import { S3Service } from "../services/s3.service";
import { HTTP_STATUS } from '../utils/errorMapper';
import { ApiError } from "../utils/ApiError";

export const createTopicService = async ({ topic_name, photo }: { topic_name: string; photo?: Express.Multer.File }) => {
  let photoKey: string | null = null;
  let photoUrl: string | null = null;

  // Handle photo upload if provided
  if (photo) {
    try {
      const uploadResult = await S3Service.uploadFile(photo, 'topics');
      photoUrl = uploadResult.url;
      photoKey = uploadResult.key;
    } catch (error) {
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to upload photo to S3");
    }
  }

  // Generate slug from topic name
  const baseSlug = slugify(topic_name).toLowerCase();

  let finalSlug = baseSlug;
  let counter = 1;

  // Check for existing slug and generate unique one if needed
  while (
    await prisma.topic.findFirst({
      where: { slug: finalSlug },
    })
  ) {
    finalSlug = `${baseSlug}-${counter++}`;
  }

  try {
    const topic = await prisma.topic.create({
      data: {
        topic_name,
        slug: finalSlug,
        photo_url: photoUrl,
      },
    });

    return topic;
  } catch (error: any) {
    // If database creation fails, clean up uploaded photo
    if (photoKey) {
      try {
        await S3Service.deleteFile(photoKey);
      } catch (cleanupError) {
        console.error("Failed to cleanup photo after database error:", cleanupError);
      }
    }

    if (error.code === "P2002") {
      throw new ApiError(HTTP_STATUS.CONFLICT, "Topic already exists");
    }

    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to create topic");
  }
};

export const getAllTopicsService = async () => {
  const topics = await prisma.topic.findMany({
    orderBy: { created_at: "desc" },
  });

  return topics;
};

interface GetTopicsForBatchInput {
  batchId: number;
  query?: any;
}

export const getTopicsForBatchService = async ({ batchId, query }: GetTopicsForBatchInput) => {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      classes: {
        where: { batch_id: batchId },
        include: {
          topic: true,
          questionVisibility: {
            include: {
              question: {
                select: {
                  id: true,
                  topic_id: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!batch) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Batch not found");
  }

  // Get ALL topics for this batch (not just ones with classes)
  // const allTopics = await prisma.topic.findMany({
  //   where: {
  //     // Get topics that are either:
  //     // 1. Assigned to this batch via classes, OR
  //     // 2. Global topics not assigned to any specific batch
  //     OR: [
  //       {
  //         classes: {
  //           some: {
  //             batch_id: batchId
  //           }
  //         }
  //       },
  //       {
  //         classes: {
  //           none: {}  // Global topics with no classes
  //         }
  //       }
  //     ]
  //   },
  //   include: {
  //     classes: {
  //       where: {
  //         batch_id: batchId
  //       },
  //       include: {
  //         questionVisibility: {
  //           include: {
  //             question: {
  //               select: {
  //                 id: true,
  //                 topic_id: true,
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   },
  //   orderBy: { created_at: "desc" }
  // });
     const allTopics = await prisma.topic.findMany({
    orderBy: { created_at: "desc" }
  });
 
  // Step 2: Get all classes for THIS batch
  const batchClasses = await prisma.class.findMany({
    where: { batch_id: batchId },
    include: {
      questionVisibility: true
    }
  });
 
  // Step 3: Create map of topic -> classes/questions for THIS batch
  const topicStats = new Map();
  
  batchClasses.forEach(cls => {
    const currentStats = topicStats.get(cls.topic_id) || { classCount: 0, questionCount: 0 };
    currentStats.classCount += 1;
    currentStats.questionCount += cls.questionVisibility.length;
    topicStats.set(cls.topic_id, currentStats);
  });
 
  // Step 4: Transform all topics with stats
  const topics = allTopics.map(topic => {
    const stats = topicStats.get(topic.id) || { classCount: 0, questionCount: 0 };
    
    return {
      id: topic.id.toString(),
      topic_name: topic.topic_name,
      slug: topic.slug,
      photo_url: topic.photo_url,
      created_at: topic.created_at,
      updated_at: topic.updated_at,
      classCount: stats.classCount,        // 0 for new batches
      questionCount: stats.questionCount,  // 0 for new batches
      firstClassCreated_at: null
    };
  });

  // Create topic map with class counts
  const topicMap = new Map();
  
  // Initialize all topics with 0 counts
  allTopics.forEach(topic => {
    topicMap.set(topic.id, {
      id: topic.id.toString(),
      topic_name: topic.topic_name,
      slug: topic.slug,
      photo_url: topic.photo_url,
      classCount: 0,
      questionCount: 0,
      firstClassCreated_at: null
    });
  });
  
  // Update counts for topics that have classes in this batch
  batch.classes.forEach(cls => {
    const topic = topicMap.get(cls.topic.id);
    if (topic) {
      topic.classCount = (topic.classCount || 0) + 1;
      topic.questionCount = (topic.questionCount || 0) + cls.questionVisibility.length;
      topic.firstClassCreated_at = cls.created_at;
    }
  });

  
  
  // Apply search filter if provided
  let filteredTopics = topics;
  if (query?.search) {
    filteredTopics = topics.filter(topic => 
      topic.topic_name.toLowerCase().includes(query.search.toLowerCase())
    );
  }

  // Apply sorting
  const sortBy = query?.sortBy || 'recent';
  filteredTopics.sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.firstClassCreated_at || 0).getTime() - new Date(b.firstClassCreated_at || 0).getTime();
      case 'classes':
        return (b.classCount || 0) - (a.classCount || 0);
      case 'questions':
        return (b.questionCount || 0) - (a.questionCount || 0);
      case 'recent':
      default:
        return new Date(b.firstClassCreated_at || 0).getTime() - new Date(a.firstClassCreated_at || 0).getTime();
    }
  });

  // Apply pagination
  const page = parseInt(query?.page as string) || 1;
  const limit = parseInt(query?.limit as string) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedTopics = filteredTopics.slice(startIndex, endIndex);

  return {
    topics: paginatedTopics,
    pagination: {
      total: filteredTopics.length,
      totalPages: Math.ceil(filteredTopics.length / limit),
      page,
      limit
    }
  };
};

interface UpdateTopicInput {
  topicSlug: string;
  topic_name?: string;
  photo?: Express.Multer.File;
  removePhoto?: boolean;
}

export const updateTopicService = async ({ topicSlug, topic_name, photo, removePhoto }: UpdateTopicInput) => {
  // Find existing topic
  const existingTopic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
  });

  if (!existingTopic) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Topic not found");
  }

  let newPhotoUrl: string | null = existingTopic.photo_url;
  let oldPhotoKey: string | null = null;

  // Handle photo removal
  if (removePhoto && existingTopic.photo_url) {
    // Extract key from URL
    const urlParts = existingTopic.photo_url.split('/');
    oldPhotoKey = urlParts[urlParts.length - 1];
    if (oldPhotoKey) {
      oldPhotoKey = `topics/${oldPhotoKey}`;
    }
    newPhotoUrl = null;
  }

  // Handle new photo upload
  if (photo) {
    try {
      const uploadResult = await S3Service.uploadFile(photo, 'topics');
      newPhotoUrl = uploadResult.url;

      // If we had an old photo, mark its key for deletion
      if (existingTopic.photo_url) {
        const urlParts = existingTopic.photo_url.split('/');
        oldPhotoKey = `topics/${urlParts[urlParts.length - 1]}`;
      }
    } catch (error) {
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to upload photo to S3");
    }
  }

  // Handle topic name update if provided
  let finalSlug = existingTopic.slug;
  if (topic_name) {
    const duplicate = await prisma.topic.findUnique({
      where: { topic_name },
    });

    if (duplicate && duplicate.id !== existingTopic.id) {
      throw new ApiError(HTTP_STATUS.CONFLICT, "Topic already exists");
    }

    const baseSlug = slugify(topic_name).toLowerCase();

    finalSlug = baseSlug;
    let counter = 1;

    while (
      await prisma.topic.findFirst({
        where: {
          slug: finalSlug,
          NOT: { id: existingTopic.id },
        },
      })
    ) {
      finalSlug = `${baseSlug}-${counter++}`;
    }
  }

  try {
    const updatedTopic = await prisma.topic.update({
      where: { id: existingTopic.id },
      data: {
        ...(topic_name && { topic_name }),
        slug: finalSlug,
        photo_url: newPhotoUrl,
      },
    });

    // Clean up old photo from S3 if update was successful
    if (oldPhotoKey) {
      try {
        await S3Service.deleteFile(oldPhotoKey);
      } catch (cleanupError) {
        console.error("Failed to cleanup old photo from S3:", cleanupError);
      }
    }

    return updatedTopic;

  } catch (error: any) {
    // If database update fails, clean up newly uploaded photo
    if (photo && newPhotoUrl && newPhotoUrl !== existingTopic.photo_url) {
      const urlParts = newPhotoUrl.split('/');
      const newPhotoKey = `topics/${urlParts[urlParts.length - 1]}`;
      try {
        await S3Service.deleteFile(newPhotoKey);
      } catch (cleanupError) {
        console.error("Failed to cleanup new photo after database error:", cleanupError);
      }
    }

    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to update topic");
  }
};

interface DeleteTopicInput {
  topicSlug: string;
}

export const deleteTopicService = async ({ topicSlug }: DeleteTopicInput) => {
  const topic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
  });

  if (!topic) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Topic not found");
  }

  const classCount = await prisma.class.count({
    where: { topic_id: topic.id },
  });

  if (classCount > 0) {
    throw new ApiError(HTTP_STATUS.CONFLICT, "Cannot delete topic with existing classes");
  }

  const questionCount = await prisma.question.count({
    where: { topic_id: topic.id },
  });

  if (questionCount > 0) {
    throw new ApiError(HTTP_STATUS.CONFLICT, "Cannot delete topic with existing questions");
  }

  // Delete topic from database
  await prisma.topic.delete({
    where: { id: topic.id },
  });

  // Clean up photo from S3 if it exists
  if (topic.photo_url) {
    try {
      const urlParts = topic.photo_url.split('/');
      const photoKey = `topics/${urlParts[urlParts.length - 1]}`;
      await S3Service.deleteFile(photoKey);
    } catch (cleanupError) {
      console.error("Failed to cleanup photo from S3 after topic deletion:", cleanupError);
    }
  }

  return true;
};

interface GetTopicsWithBatchProgressInput {
  studentId: number;
  batchId: number;
}

export const getTopicsWithBatchProgressService = async ({
  studentId,
  batchId,
}: GetTopicsWithBatchProgressInput) => {
  // Get all topics with batch-specific classes and question counts
  const topics = await prisma.topic.findMany({
    include: {
      classes: {
        where: {
          batch_id: batchId
        },
        include: {
          questionVisibility: {
            include: {
              question: {
                select: {
                  id: true,
                  topic_id: true
                }
              }
            }
          }
        },
        orderBy: { created_at: 'asc' }
      }
    }
  });

  // Get all question IDs assigned to this batch
  const assignedQuestionIds = new Set<number>();
  topics.forEach((topic: any) => {
    topic.classes.forEach((cls: any) => {
      cls.questionVisibility.forEach((qv: any) => {
        assignedQuestionIds.add(qv.question.id);
      });
    });
  });

  // Get student's solved questions for this batch only
  const studentProgress = await prisma.studentProgress.findMany({
    where: {
      student_id: studentId,
      question_id: { in: Array.from(assignedQuestionIds) }
    },
    include: {
      question: {
        select: {
          topic_id: true
        }
      }
    }
  });

  // Group solved questions by topic
  const solvedByTopic = new Map<number, Set<number>>();
  studentProgress.forEach(progress => {
    const topicId = progress.question.topic_id;
    if (!solvedByTopic.has(topicId)) {
      solvedByTopic.set(topicId, new Set());
    }
    solvedByTopic.get(topicId)!.add(progress.question_id);
  });

  // Format response
  const formattedTopics = topics.map((topic: any) => {
    // Count unique questions assigned to this batch for this topic
    const assignedQuestions = new Set<number>();

    topic.classes.forEach((cls: any) => {
      cls.questionVisibility.forEach((qv: any) => {
        // Only count questions that belong to this topic
        if (qv.question.topic_id === topic.id) {
          assignedQuestions.add(qv.question.id);
        }
      });
    });

    // Get solved questions for this topic
    const solvedQuestions = solvedByTopic.get(topic.id) || new Set();

    // Find earliest class creation date, or null if no classes
    const firstClass = topic.classes.length > 0 
      ? topic.classes.reduce((earliest: any, cls: any) => {
          return !earliest || cls.created_at < earliest.created_at ? cls : earliest;
        }, null)
      : null;

    return {
      id: topic.id,
      topic_name: topic.topic_name,
      slug: topic.slug,
      photo_url: topic.photo_url,
      firstClassCreatedAt: firstClass?.created_at || null,
      batchSpecificData: {
        totalClasses: topic.classes.length,
        totalQuestions: assignedQuestions.size,
        solvedQuestions: solvedQuestions.size
      }
    };
  });

  // Sort by firstClassCreatedAt (newest first), topics without classes go to end
  formattedTopics.sort((a: any, b: any) => {
    // Both have classes - sort by date (newest first)
    if (a.firstClassCreatedAt && b.firstClassCreatedAt) {
      return new Date(b.firstClassCreatedAt).getTime() - new Date(a.firstClassCreatedAt).getTime();
    }
    // Only A has classes - A comes first
    if (a.firstClassCreatedAt && !b.firstClassCreatedAt) {
      return -1;
    }
    // Only B has classes - B comes first  
    if (!a.firstClassCreatedAt && b.firstClassCreatedAt) {
      return 1;
    }
    // Neither has classes - keep original order
    return 0;
  });

  return formattedTopics;
};

interface GetTopicOverviewWithClassesSummaryInput {
  studentId: number;
  batchId: number;
  topicSlug: string;
  query?: any;
}

export const getTopicOverviewWithClassesSummaryService = async ({
  studentId,
  batchId,
  topicSlug,
  query,
}: GetTopicOverviewWithClassesSummaryInput) => {
  // Get topic with batch-specific classes
  const topic = await prisma.topic.findFirst({
    where: { slug: topicSlug },
    include: {
      classes: {
        where: {
          batch_id: batchId
        },
        include: {
          questionVisibility: {
            include: {
              question: {
                select: {
                  id: true
                }
              }
            }
          }
        },
        orderBy: { created_at: 'asc' }
      }
    }
  });

  if (!topic) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Topic not found");
  }

  // Get all question IDs assigned to this batch for this topic
  const assignedQuestionIds = new Set<number>();
  topic.classes.forEach((cls: any) => {
    cls.questionVisibility.forEach((qv: any) => {
      assignedQuestionIds.add(qv.question.id);
    });
  });

  // Get student's solved questions for this batch only
  const studentProgress = await prisma.studentProgress.findMany({
    where: {
      student_id: studentId,
      question_id: { in: Array.from(assignedQuestionIds) }
    },
    include: {
      question: {
        select: {
          id: true
        }
      }
    }
  });

  // Create a Set of solved question IDs for quick lookup
  const solvedQuestionIds = new Set(
    studentProgress.map(progress => progress.question_id)
  );

  // Format classes with summary data
  const classesSummary = topic.classes.map((cls: any) => {
    // Count total questions for this class
    const totalQuestions = cls.questionVisibility.length;

    // Count solved questions for this class
    const solvedQuestions = cls.questionVisibility.filter((qv: any) =>
      solvedQuestionIds.has(qv.question.id)
    ).length;

    return {
      id: cls.id,
      class_name: cls.class_name,
      slug: cls.slug,
      description: cls.description,
      pdf_url: cls.pdf_url,
      classDate: cls.class_date,
      totalQuestions,
      solvedQuestions
    };
  });

  // Apply pagination for classes
  const page = parseInt(query?.page as string) || 1;
  const limit = parseInt(query?.limit as string) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedClasses = classesSummary.slice(startIndex, endIndex);

  // Calculate overall topic progress (based on all classes, not just paginated)
  const totalTopicQuestions = classesSummary.reduce((sum: number, cls: any) => sum + cls.totalQuestions, 0);
  const totalSolvedQuestions = classesSummary.reduce((sum: number, cls: any) => sum + cls.solvedQuestions, 0);

  return {
    id: (topic as any).id,
    topic_name: (topic as any).topic_name,
    slug: (topic as any).slug,
    description: (topic as any).description || null,
    photo_url: (topic as any).photo_url || null,
    classes: paginatedClasses,
    pagination: {
      total: classesSummary.length,
      totalPages: Math.ceil(classesSummary.length / limit),
      page,
      limit,
      hasNext: page < Math.ceil(classesSummary.length / limit),
      hasPrev: page > 1
    },
    overallProgress: {
      totalClasses: classesSummary.length,
      totalQuestions: totalTopicQuestions,
      solvedQuestions: totalSolvedQuestions
    }
  };
};
