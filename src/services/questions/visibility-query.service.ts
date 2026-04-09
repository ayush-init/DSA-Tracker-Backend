import prisma from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

interface GetAssignedInput {
  batchId: number;
  topicSlug: string;
  classSlug: string;
  page?: number;
  limit?: number;
  search?: string;
}

export const getAssignedQuestionsOfClassService = async ({
  batchId,
  topicSlug,
  classSlug,
  page = 1,
  limit = 25,
  search = '',
}: GetAssignedInput) => {
  // Enforce max pagination limit for safety
  const safeLimit = Math.min(limit, 100);

  // Validate class exists in batch and topic via relation (single query)
  const cls = await prisma.class.findFirst({
    where: {
      slug: classSlug,
      batch_id: batchId,
      topic: {
        slug: topicSlug,
      },
    },
    select: { id: true },
  });

  if (!cls) {
    throw new ApiError(400, "Class not found in this topic and batch");
  }

  // Build where clause
  const whereClause: any = {
    class_id: cls.id,
  };

  // Add search filter if provided
  if (search) {
    whereClause.question = {
      question_name: {
        contains: search,
        mode: 'insensitive'
      }
    };
  }

  // Calculate pagination
  const skip = (page - 1) * safeLimit;

  // Parallelize count and data queries
  const [total, assigned] = await Promise.all([
    prisma.questionVisibility.count({
      where: whereClause,
    }),
    prisma.questionVisibility.findMany({
      where: whereClause,
      select: {
        id: true,
        type: true,
        assigned_at: true,
        question: {
          select: {
            id: true,
            question_name: true,
            question_link: true,
            platform: true,
            level: true,
            created_at: true,
            topic: {
              select: { topic_name: true, slug: true },
            },
          },
        },
      },
      orderBy: {
        assigned_at: "desc",
      },
      skip,
      take: safeLimit,
    }),
  ]);

  const totalPages = Math.ceil(total / safeLimit);
  const questions = assigned.map((qv) => ({
    ...qv.question,
    visibility_id: qv.id,
    type: qv.type,
    assigned_at: qv.assigned_at,
  }));

  return {
    data: questions,
    pagination: {
      page,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
};
