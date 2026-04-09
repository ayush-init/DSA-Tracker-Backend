import prisma from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

interface GetAllQuestionsInput {
  topicSlug?: string;
  level?: string;
  platform?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const getAllQuestionsService = async ({
  topicSlug,
  level,
  platform,
  search,
  page = 1,
  limit = 10,
}: GetAllQuestionsInput) => {

  const where: any = {};

  //  Pagination safety - enforce max limit
  const validatedLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (page - 1) * validatedLimit;

  //  Topic filter (using relation filter instead of separate query)
  if (topicSlug && topicSlug !== 'all') {
    where.topic = { slug: topicSlug };
  }

  //  Level filter
  if (level) {
    where.level = level;
  }

  //  Platform filter
  if (platform) {
    where.platform = platform;
  }

  //  Search filter
  if (search) {
    where.question_name = {
      contains: search,
      mode: "insensitive",
    };
  }

  const [questions, total] = await prisma.$transaction([
    prisma.question.findMany({
      where,
      include: {
        topic: {
          select: {
            topic_name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: validatedLimit,
    }),

    prisma.question.count({ where }),
  ]);

  //  Validate topic exists if topic filter was applied but no results
  if (topicSlug && topicSlug !== 'all' && questions.length === 0) {
    const topicExists = await prisma.topic.count({
      where: { slug: topicSlug },
      take: 1,
    });
    if (topicExists === 0) {
      throw new ApiError(400, "Topic not found");
    }
  }

  return {
    data: questions,
    pagination: {
      total,
      page,
      limit: validatedLimit,
      totalPages: Math.ceil(total / validatedLimit),
    },
  };
};

export const getAssignedQuestionsService = async (query: any) => {

  try {

    const { city, batch, year } = query;

    const batchFilter: any = {};

    // -----------------------------
    // CITY FILTER
    // -----------------------------
    if (city) {

      const cityExists = await prisma.city.findUnique({
        where: { city_name: city }
      });

      if (!cityExists) {
        throw new ApiError(400, "Invalid city");
      }

      batchFilter.city = {
        city_name: city
      };
    }

    // -----------------------------
    // BATCH FILTER
    // -----------------------------
    if (batch) {

      const batchExists = await prisma.batch.findUnique({
        where: { 
          slug: batch
        }
      });

      if (!batchExists) {
        throw new ApiError(400, "Invalid batch");
      }

      batchFilter.batch_name = batch;
    }

    // -----------------------------
    // YEAR FILTER
    // -----------------------------
    if (year) {

      const parsedYear = Number(year);

      if (isNaN(parsedYear)) {
        throw new ApiError(400, "Year must be a number");
      }

      batchFilter.year = parsedYear;
    }

    // -----------------------------
    // FETCH BATCHES
    // -----------------------------

    const batches = await prisma.batch.findMany({
      where: batchFilter,
      select: { id: true }
    });

    if (batch && batches.length === 0) {
      throw new ApiError(400, "Batch not found");
    }

    const batchIds = batches.map(b => b.id);

    // -----------------------------
    // FETCH ASSIGNED QUESTIONS
    // -----------------------------

    const questions = await prisma.question.findMany({
      where: {
        visibility: {
          some: {
            class: {
              batch_id: {
                in: batchIds.length ? batchIds : undefined
              }
            }
          }
        }
      },
      select: {
        id: true,
        question_name: true,
        platform: true,
        level: true,
        topic: {
          select: {
            topic_name: true
          }
        }
      }
    });

    // -----------------------------
    // ANALYTICS
    // -----------------------------

    const platformStats = { leetcode: 0, gfg: 0 };

    const difficultyStats = { easy: 0, medium: 0, hard: 0 };

    questions.forEach(q => {

      if (q.platform === "LEETCODE") platformStats.leetcode++;
      if (q.platform === "GFG") platformStats.gfg++;

      if (q.level === "EASY") difficultyStats.easy++;
      if (q.level === "MEDIUM") difficultyStats.medium++;
      if (q.level === "HARD") difficultyStats.hard++;

    });

    return {

      totalQuestions: questions.length,

      analytics: {
        platforms: platformStats,
        difficulty: difficultyStats,
      },

      questions

    };

  } catch (error) {

    throw new ApiError(400, "Failed to fetch assigned questions");

  }
};
