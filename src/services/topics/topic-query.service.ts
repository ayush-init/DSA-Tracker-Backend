import prisma from "../../config/prisma";
import { HTTP_STATUS } from '../../utils/errorMapper';
import { ApiError } from "../../utils/ApiError";
import { GetTopicsForBatchInput } from "../../types/topic.types";

export const getAllTopicsService = async () => {
  const topics = await prisma.topic.findMany({
    orderBy: { created_at: "desc" },
  });

  return topics;
};

export const getTopicsForBatchService = async ({ batchId, query }: GetTopicsForBatchInput) => {
  // Validate batch exists first (lightweight check)
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { id: true }
  });

  if (!batch) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Batch not found");
  }

  // Parse pagination params
  const page = parseInt(query?.page as string) || 1;
  const limit = parseInt(query?.limit as string) || 10;
  const offset = (page - 1) * limit;
  const search = query?.search as string;
  const sortBy = query?.sortBy || 'recent';

  // Build search condition for SQL
  const searchCondition = search 
    ? `AND (LOWER(t.topic_name) ILIKE LOWER($4) OR LOWER(t.slug) ILIKE LOWER($5))` 
    : '';
  const searchParams = search ? [`%${search}%`, `%${search}%`] : [];

  // Build ORDER BY clause based on sortBy parameter
  let orderByClause = 'ORDER BY last_class_created_at DESC NULLS LAST, t.created_at DESC';
  if (sortBy === 'oldest') {
    orderByClause = 'ORDER BY last_class_created_at ASC NULLS LAST, t.created_at DESC';
  } else if (sortBy === 'classes') {
    orderByClause = 'ORDER BY class_count DESC NULLS LAST, t.created_at DESC';
  } else if (sortBy === 'questions') {
    orderByClause = 'ORDER BY question_count DESC NULLS LAST, t.created_at DESC';
  }

  // Main optimized query: Get topics with aggregated counts in a single SQL query
  // Uses LEFT JOIN with aggregation at DB level instead of loading all data into memory
  const topicsQuery = `
    SELECT 
      t.id,
      t.topic_name,
      t.slug,
      t.photo_url,
      t.created_at,
      t.updated_at,
      COUNT(DISTINCT c.id)::int as class_count,
      COUNT(DISTINCT qv.question_id)::int as question_count,
      MAX(c.created_at) as last_class_created_at
    FROM "Topic" t
    LEFT JOIN "Class" c ON t.id = c.topic_id AND c.batch_id = $1
    LEFT JOIN "QuestionVisibility" qv ON c.id = qv.class_id
    WHERE 1=1 ${searchCondition}
    GROUP BY t.id, t.topic_name, t.slug, t.photo_url, t.created_at, t.updated_at
    ${orderByClause}
    LIMIT $2 OFFSET $3
  `;

  // Count query for pagination (total matching topics)
  const countQuery = `
    SELECT COUNT(DISTINCT t.id)::int as total_count
    FROM "Topic" t
    LEFT JOIN "Class" c ON t.id = c.topic_id AND c.batch_id = $1
    WHERE 1=1 ${search ? `AND (LOWER(t.topic_name) ILIKE LOWER($2) OR LOWER(t.slug) ILIKE LOWER($3))` : ''}
  `;

  // Execute queries in parallel
  const [topics, countResult] = await Promise.all([
    prisma.$queryRawUnsafe(topicsQuery, batchId, limit, offset, ...searchParams),
    prisma.$queryRawUnsafe(countQuery, batchId, ...searchParams)
  ]);

  const totalCount = (countResult as any[])[0]?.total_count || 0;

  // Map to exact same response structure as before
  const mappedTopics = (topics as any[]).map((topic: any) => ({
    id: topic.id.toString(),
    topic_name: topic.topic_name,
    slug: topic.slug,
    photo_url: topic.photo_url,
    created_at: topic.created_at,
    updated_at: topic.updated_at,
    classCount: Number(topic.class_count) || 0,
    questionCount: Number(topic.question_count) || 0,
    lastClassCreated_at: topic.last_class_created_at
  }));

  return {
    topics: mappedTopics,
    pagination: {
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      page,
      limit
    }
  };
};

export const getPaginatedTopicsService = async ({
  page = 1,
  limit = 6,
  search = ''
}: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const skip = (page - 1) * limit;

  const whereCondition: any = {};
  if (search) {
    whereCondition.OR = [
      { topic_name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [topics, totalCount] = await Promise.all([
    prisma.topic.findMany({
      where: whereCondition,
      select: {
        id: true,
        topic_name: true,
        slug: true,
      },
      orderBy: { topic_name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.topic.count({ where: whereCondition })
  ]);

  return {
    topics,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalItems: totalCount,
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPrevPage: page > 1,
    }
  };
};
