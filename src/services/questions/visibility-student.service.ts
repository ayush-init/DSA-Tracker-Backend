import prisma from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import redis from "../../config/redis";
import { CACHE_TTL } from "../../config/cache.config";
import { CacheInvalidation } from "../../utils/cacheInvalidation";
import { buildCacheKey, setWithTTL } from "../../utils/redisUtils";

// Student-specific service - get all questions with filters for student's batch
interface GetAllQuestionsWithFiltersInput {
  studentId: number;
  batchId: number;
  filters: {
    search?: string;
    topic?: string;
    level?: string;
    platform?: string;
    type?: string;
    solved?: string;
    page: number;
    limit: number;
  };
}

export const getAllQuestionsWithFiltersService = async ({
  studentId,
  batchId,
  filters
}: GetAllQuestionsWithFiltersInput) => {
  
  // Generate stable deterministic cache key
  const cacheKey = buildCacheKey(`student:assigned_questions:${studentId}:${batchId}`, filters);
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('=== REDIS CACHE HIT ===');
    console.log(`[CACHE HIT] assigned_questions for student ${studentId}`);
    console.log(`Cache Key: ${cacheKey}`);
    console.log(`Data Source: Redis Cache`);
    console.log('========================');
    return JSON.parse(cached);
  }
  
  const apiStartTime = Date.now();
  
  console.log('=== DATABASE FETCH ===');
  console.log(`[CACHE MISS] assigned_questions for student ${studentId}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`Data Source: Database Query`);
  console.log('===================');
  
  // Build base where clause for question visibility (questions assigned to this batch)
  const baseWhereClause: any = {
    class: {
      batch_id: batchId
    }
  };

  // Build filtering conditions
  const filterConditions: any[] = [];
  
  // Search filter (question_name + topic_name)
  if (filters.search) {
    filterConditions.push({
      OR: [
        {
          question: {
            question_name: {
              contains: filters.search,
              mode: 'insensitive'
            }
          }
        },
        {
          question: {
            topic: {
              topic_name: {
                contains: filters.search,
                mode: 'insensitive'
              }
            }
          }
        }
      ]
    });
  }

  // Topic filter
  if (filters.topic) {
    filterConditions.push({
      question: {
        topic: {
          slug: filters.topic
        }
      }
    });
  }

  // Level filter
  if (filters.level) {
    filterConditions.push({
      question: {
        level: filters.level.toUpperCase()
      }
    });
  }

  // Platform filter
  if (filters.platform) {
    filterConditions.push({
      question: {
        platform: filters.platform.toUpperCase()
      }
    });
  }

  // Type filter - now filters on QuestionVisibility.type
  if (filters.type) {
    filterConditions.push({
      type: filters.type.toUpperCase()
    });
  }

  // Solved/Unsolved filter using relation filtering
  if (filters.solved) {
    const isSolved = filters.solved === 'true';
    if (isSolved) {
      filterConditions.push({
        question: {
          progress: {
            some: {
              student_id: studentId
            }
          }
        }
      });
    } else {
      filterConditions.push({
        question: {
          progress: {
            none: {
              student_id: studentId
            }
          }
        }
      });
    }
  }
  
  const offset = (filters.page - 1) * filters.limit;
  
  // Build WHERE conditions for SQL
  const whereConditions: string[] = [];
  const params: (string | number)[] = [];
  
  // Base condition: batch_id
  whereConditions.push('c.batch_id = $' + (params.length + 1));
  params.push(batchId);
  
  // Search filter
  if (filters.search) {
    whereConditions.push('(q.question_name ILIKE $' + (params.length + 1) + ' OR t.topic_name ILIKE $' + (params.length + 2) + ')');
    params.push('%' + filters.search + '%', '%' + filters.search + '%');
  }
  
  // Topic filter
  if (filters.topic) {
    whereConditions.push('t.slug = $' + (params.length + 1));
    params.push(filters.topic);
  }
  
  // Level filter
  if (filters.level) {
    whereConditions.push('q.level = $' + (params.length + 1) + '::text::"Level"');
    params.push(filters.level.toUpperCase());
  }
  
  // Platform filter
  if (filters.platform) {
    whereConditions.push('q.platform = $' + (params.length + 1) + '::text::"Platform"');
    params.push(filters.platform.toUpperCase());
  }
  
  // Type filter - now filters on QuestionVisibility.type
  if (filters.type) {
    whereConditions.push('qv.type = $' + (params.length + 1) + '::text::"QuestionType"');
    params.push(filters.type.toUpperCase());
  }
  
  // Solved/Unsolved filter
  if (filters.solved) {
    if (filters.solved === 'true') {
      whereConditions.push('sp.question_id IS NOT NULL');
    } else {
      whereConditions.push('sp.question_id IS NULL');
    }
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  // Calculate indices for studentId in JOIN conditions
  // These will be the same for both queries since they come after filters
  const filterParamsCount = params.length;
  const studentIdParamIndex = filterParamsCount + 1;  // First studentId position
  const bookmarkIdParamIndex = filterParamsCount + 2; // Second studentId position
  const limitParamIndex = filterParamsCount + 3;      // LIMIT position
  const offsetParamIndex = filterParamsCount + 4;     // OFFSET position
  
  // Main data query params: filter params + 2 studentIds + limit + offset
  const dataParams = [...params, studentId, studentId, filters.limit, offset];
  
  // Count query params: filter params + 2 studentIds (no limit/offset)
  const countParams = [...params, studentId, studentId];
  
  // Main data query with single JOIN
  const dataQuery = `
    SELECT DISTINCT 
      q.id,
      q.question_name,
      q.question_link,
      q.level,
      q.platform,
      qv.type,
      q.created_at,
      t.id as topic_id,
      t.topic_name,
      t.slug,
      CASE WHEN sp.question_id IS NOT NULL THEN true ELSE false END as "isSolved",
      CASE WHEN b.question_id IS NOT NULL THEN true ELSE false END as "isBookmarked",
      sp.sync_at
    FROM "QuestionVisibility" qv
    JOIN "Class" c ON qv.class_id = c.id
    JOIN "Question" q ON qv.question_id = q.id
    JOIN "Topic" t ON q.topic_id = t.id
    LEFT JOIN "StudentProgress" sp ON q.id = sp.question_id AND sp.student_id = $${studentIdParamIndex}
    LEFT JOIN "Bookmark" b ON q.id = b.question_id AND b.student_id = $${bookmarkIdParamIndex}
    WHERE ${whereClause}
    ORDER BY q.created_at DESC
    LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
  `;
  
  // Count query with same conditions
  const countQuery = `
    SELECT COUNT(DISTINCT q.id) as count
    FROM "QuestionVisibility" qv
    JOIN "Class" c ON qv.class_id = c.id
    JOIN "Question" q ON qv.question_id = q.id
    JOIN "Topic" t ON q.topic_id = t.id
    LEFT JOIN "StudentProgress" sp ON q.id = sp.question_id AND sp.student_id = $${studentIdParamIndex}
    LEFT JOIN "Bookmark" b ON q.id = b.question_id AND b.student_id = $${bookmarkIdParamIndex}
    WHERE ${whereClause}
  `;
  
  const dbStartTime = Date.now();
  const [paginatedQuestions, totalCount] = await Promise.all([
    prisma.$queryRawUnsafe(dataQuery, ...dataParams),
    prisma.$queryRawUnsafe(countQuery, ...countParams)
  ]);
  
  // Convert BigInt to Number for JSON serialization
  const totalCountNumber = Number((totalCount as any[])[0]?.count || 0);
  
  const dbQueryTime = Date.now() - dbStartTime;
  // Database queries completed

  // Map RAW SQL results to exact previous response structure
  const questions = (paginatedQuestions as any[]).map((row: any) => {
    return {
      id: row.id,
      question_name: row.question_name,
      question_link: row.question_link,
      level: row.level,
      platform: row.platform,
      type: row.type,
      created_at: row.created_at,
      topic: {
        id: row.topic_id,
        topic_name: row.topic_name,
        slug: row.slug
      },
      isSolved: row.isSolved,
      isBookmarked: row.isBookmarked,
      syncAt: row.sync_at
    };
  });

  // Get filter options from paginated results only (no extra query needed)
  const uniqueTopics = questions.map((q: any) => q.topic);
  const topics = uniqueTopics.filter((topic: any, index: number, self: any[]) => 
    self.findIndex((t: any) => t.id === topic.id) === index
  );
  
  // Extract unique values from paginated results
  const levels = [...new Set(questions.map((q: any) => q.level))].sort();
  const platforms = [...new Set(questions.map((q: any) => q.platform))].sort();
  const types = [...new Set(questions.map((q: any) => q.type))].sort();
  
  // Include all available enum values for complete filter options
  const allLevels = ['EASY', 'MEDIUM', 'HARD'];
  const allPlatforms = ['LEETCODE', 'GFG', 'OTHER', 'INTERVIEWBIT'];
  const allTypes = ['HOMEWORK', 'CLASSWORK'];

// ...
  // Calculate solved count from paginated results
  const solvedCount = questions.filter(q => q.isSolved).length;
  const totalApiTime = Date.now() - apiStartTime;

  const result = {
    questions,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      totalQuestions: totalCountNumber,
      totalPages: Math.ceil(totalCountNumber / filters.limit)
    },
    filters: {
      topics,
      levels: allLevels,        // All enum values from database
      platforms: allPlatforms,  // All enum values from database  
      types: allTypes           // All enum values from database
    },
    stats: {
      total: totalCountNumber,
      solved: solvedCount
    }
  };

  // 3. Cache result with modern Redis SET syntax (avoid duplicate JSON.stringify)
  const serializedResult = JSON.stringify(result);
  await setWithTTL(cacheKey, serializedResult, CACHE_TTL.studentAssignedQuestions);
  
  console.log('=== CACHE STORAGE ===');
  console.log(`[CACHE STORE] assigned_questions for student ${studentId}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`TTL: ${CACHE_TTL.studentAssignedQuestions} seconds (${CACHE_TTL.studentAssignedQuestions/60} minutes)`);
  console.log(`Data Source: Database Query -> Cached in Redis`);
  console.log('====================');

  return result;
};
