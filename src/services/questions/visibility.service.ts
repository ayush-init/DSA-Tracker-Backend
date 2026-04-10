import prisma from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { QuestionAssignmentItem, AssignQuestionsInput, RemoveQuestionInput } from "../../types/question.types";
import { CacheInvalidation } from "../../utils/cacheInvalidation";

export const assignQuestionsToClassService = async ({
  batchId,
  topicSlug,
  classSlug,
  questions,
}: AssignQuestionsInput) => {

  if (!questions || questions.length === 0) {
    throw new ApiError(400, "No questions provided");
  }

  // Find topic first
  const topic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
  });

  if (!topic) {
    throw new ApiError(400, "Topic not found");
  }

  const cls = await prisma.class.findFirst({
    where: {
      slug: classSlug,
      batch_id: batchId,
      topic_id: topic.id,  // Add topic validation
    },
  });

  if (!cls) {
    throw new ApiError(400, "Class not found in this topic and batch");
  }

  const data = questions.map((q) => ({
    class_id: cls.id,
    question_id: q.question_id,
    type: q.type,
  }));

  await prisma.questionVisibility.createMany({
    data,
    skipDuplicates: true,
  });

  // Update batch question counts after assignment
  await updateBatchQuestionCounts(batchId);

  // Invalidate all affected caches
  await CacheInvalidation.invalidateAssignedQuestionsForBatch(batchId);
  await CacheInvalidation.invalidateTopicsForBatch(batchId); // Topic question counts changed
  await CacheInvalidation.invalidateTopicOverviewsForBatch(batchId); // Topic overviews affected
  await CacheInvalidation.invalidateClassProgressForBatch(batchId); // Class progress affected
  await CacheInvalidation.invalidateClassProgressForClass(cls.id); // Specific class affected
  await CacheInvalidation.invalidateBookmarks(); // Bookmarks might reference questions
  await CacheInvalidation.invalidateAllStudentProfiles(); // Profile coding stats affected
  await CacheInvalidation.invalidateAllLeaderboards(); // Leaderboard ranks change
  await CacheInvalidation.invalidateRecentQuestions(); // Recent questions list affected

  return { assignedCount: questions.length };
};

export const removeQuestionFromClassService = async ({
  batchId,
  topicSlug,
  classSlug,
  questionId,
}: RemoveQuestionInput) => {

  // Find topic first
  const topic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
  });

  if (!topic) {
    throw new ApiError(400, "Topic not found");
  }

  const cls = await prisma.class.findFirst({
    where: {
      slug: classSlug,
      batch_id: batchId,
      topic_id: topic.id,  // Add topic validation
    },
  });

  if (!cls) {
    throw new ApiError(400, "Class not found in this topic and batch");
  }

  await prisma.questionVisibility.deleteMany({
    where: {
      class_id: cls.id,
      question_id: questionId,
    },
  });

  // Update batch question counts after removal
  await updateBatchQuestionCounts(batchId);

  // Invalidate all affected caches
  await CacheInvalidation.invalidateAssignedQuestionsForBatch(batchId);
  await CacheInvalidation.invalidateTopicsForBatch(batchId); // Topic question counts changed
  await CacheInvalidation.invalidateTopicOverviewsForBatch(batchId); // Topic overviews affected
  await CacheInvalidation.invalidateClassProgressForBatch(batchId); // Class progress affected
  await CacheInvalidation.invalidateClassProgressForClass(cls.id); // Specific class affected
  await CacheInvalidation.invalidateBookmarks(); // Bookmarks might reference questions
  await CacheInvalidation.invalidateAllStudentProfiles(); // Profile coding stats affected
  await CacheInvalidation.invalidateAllLeaderboards(); // Leaderboard ranks change
  await CacheInvalidation.invalidateRecentQuestions(); // Recent questions list affected

  return true;
};

interface UpdateVisibilityTypeInput {
  batchId: number;
  topicSlug: string;
  classSlug: string;
  visibilityId: number;
  type: "HOMEWORK" | "CLASSWORK";
}

export const updateQuestionVisibilityTypeService = async ({
  batchId,
  topicSlug,
  classSlug,
  visibilityId,
  type
}: UpdateVisibilityTypeInput) => {
  // Find topic first
  const topic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
  });

  if (!topic) {
    throw new ApiError(400, "Topic not found");
  }

  const cls = await prisma.class.findFirst({
    where: {
      slug: classSlug,
      batch_id: batchId,
      topic_id: topic.id,
    },
  });

  if (!cls) {
    throw new ApiError(400, "Class not found in this topic and batch");
  }

  // Verify the visibility record exists and belongs to this class
  const visibility = await prisma.questionVisibility.findFirst({
    where: {
      id: visibilityId,
      class_id: cls.id,
    },
  });

  if (!visibility) {
    throw new ApiError(404, "Question visibility record not found");
  }

  // Update the type
  const updated = await prisma.questionVisibility.update({
    where: { id: visibilityId },
    data: { type },
  });

  return updated;
};

// Helper function to update batch question counts
async function updateBatchQuestionCounts(batchId: number) {
  try {
    // STRATEGY 1: Single aggregate SQL query to replace nested loops
    const aggregateQuery = `
      SELECT 
        q.level,
        COUNT(q.id) as count
      FROM "Class" c
      INNER JOIN "QuestionVisibility" qv ON c.id = qv.class_id
      INNER JOIN "Question" q ON qv.question_id = q.id
      WHERE c.batch_id = $1
      GROUP BY q.level
    `;

    const results = await prisma.$queryRawUnsafe(aggregateQuery, batchId) as Array<{
      level: string;
      count: bigint;
    }>;

    // Extract counts from aggregate results
    let hardCount = 0;
    let mediumCount = 0;
    let easyCount = 0;

    results.forEach(result => {
      const count = Number(result.count);
      switch (result.level) {
        case 'HARD':
          hardCount = count;
          break;
        case 'MEDIUM':
          mediumCount = count;
          break;
        case 'EASY':
          easyCount = count;
          break;
      }
    });

    // Update the batch with the new counts
    await prisma.batch.update({
      where: { id: batchId },
      data: {
        hard_assigned: hardCount,
        medium_assigned: mediumCount,
        easy_assigned: easyCount
      }
    });

    console.log(`Updated batch ${batchId} question counts: H=${hardCount}, M=${mediumCount}, E=${easyCount}`);
    
  } catch (error) {
    console.error(`Failed to update batch ${batchId} question counts:`, error);
    throw error;
  }
}
