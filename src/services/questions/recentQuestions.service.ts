import prisma from "../../config/prisma";

interface GetRecentQuestionsInput {
  batchId: number;
  date?: string; // Format: YYYY-MM-DD
  page?: number;
  limit?: number;
}

// Default pagination settings - hardcoded in service
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12; // 10-12 items per page as requested

export const getRecentQuestionsService = async ({
  batchId,
  date,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT
}: GetRecentQuestionsInput) => {

  // Calculate date range for the specific date
  let startDate: Date;
  let endDate: Date;

  if (date) {
    // Parse the provided date (YYYY-MM-DD format)
    const parsedDate = new Date(date + 'T00:00:00.000Z');
    startDate = new Date(parsedDate);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(parsedDate);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Default to today if no date provided
    const today = new Date();
    startDate = new Date(today);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);
  }

  // Calculate skip for pagination
  const skip = (page - 1) * limit;

  // Get total count for pagination metadata (using queryRaw for distinct count)
  const countResult = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT question_id) as count
    FROM "QuestionVisibility"
    WHERE assigned_at >= ${startDate}
      AND assigned_at <= ${endDate}
      AND class_id IN (
        SELECT id FROM "Class" WHERE batch_id = ${batchId}
      )
  `;
  const totalCount = Number(countResult[0]?.count || 0);

  // Get paginated questions from database using Prisma skip/take
  // This prevents loading all questions into memory
  const recentQuestions = await prisma.questionVisibility.findMany({
    where: {
      class: {
        batch_id: batchId
      },
      assigned_at: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      question: {
        include: {
          topic: {
            select: {
              slug: true
            }
          }
        }
      },
      class: {
        select: {
          slug: true
        }
      }
    },
    orderBy: {
      assigned_at: 'desc'
    },
    distinct: ['question_id'],
    skip,  // Prisma skip - database level pagination
    take: limit // Prisma take - only fetch requested items
  });

  // Format response
  const questions = recentQuestions.map((qv) => ({
    question_id: qv.question.id,
    question_name: qv.question.question_name,
    difficulty: qv.question.level,
    topic_slug: qv.question.topic.slug,
    class_slug: qv.class.slug,
    assigned_at: qv.assigned_at
  }));

  return {
    questions,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNext: page < Math.ceil(totalCount / limit),
      hasPrev: page > 1
    }
  };
};
