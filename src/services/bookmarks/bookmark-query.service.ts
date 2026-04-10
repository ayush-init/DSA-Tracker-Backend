import prisma from "../../config/prisma";
import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from '../../utils/errorMapper';
import redis from "../../config/redis";
import { CACHE_TTL } from "../../config/cache.config";
import { buildCacheKey, setWithTTL } from "../../utils/redisUtils";

export const getBookmarksService = async (
  studentId: number,
  options: {
    page: number;
    limit: number;
    sort: 'recent' | 'old' | 'solved' | 'unsolved';
    filter: 'all' | 'solved' | 'unsolved';
  }
) => {
  const { page = 1, limit = 10, sort = 'recent', filter = 'all' } = options;

  // Generate stable deterministic cache key
  const cacheKey = buildCacheKey(`student:bookmarks:${studentId}`, {
    page,
    limit,
    sort,
    filter
  });
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('=== REDIS CACHE HIT ===');
    console.log(`[CACHE HIT] bookmarks for student ${studentId}`);
    console.log(`Cache Key: ${cacheKey}`);
    console.log(`Data Source: Redis Cache`);
    console.log('========================');
    return JSON.parse(cached);
  }
  
  console.log('=== DATABASE FETCH ===');
  console.log(`[CACHE MISS] bookmarks for student ${studentId}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`Data Source: Database Query`);
  console.log('===================');

  try {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // OPTIMIZED: Simple where clause - only filter by student_id
    // Removed: correlated subqueries for solved/unsolved filter
    const whereClause = { student_id: studentId };

    // OPTIMIZED: Simple orderBy - only by created_at
    // Removed: complex orderBy with progress.some/none
    const orderBy: Prisma.BookmarkOrderByWithRelationInput = sort === 'old' 
      ? { created_at: 'asc' } 
      : { created_at: 'desc' }; // 'recent', 'solved', 'unsolved' all use created_at desc

    // Calculate total count (fast with index on student_id)
    const totalCount = await prisma.bookmark.count({ where: whereClause });

    // For filter=solved/unsolved, we need a buffer to ensure we return 'take' items
    // after JS filtering. Fetch 3x the limit as a reasonable buffer.
    const needsJsFilter = filter === 'solved' || filter === 'unsolved';
    const needsJsSort = sort === 'solved' || sort === 'unsolved';
    const dbTake = needsJsFilter ? take * 3 : take;
    const dbSkip = needsJsFilter ? 0 : skip; // When filtering in JS, start from beginning and paginate in JS

    // Fetch bookmarks with simple, fast query
    const bookmarks = await prisma.bookmark.findMany({
      where: whereClause,
      include: {
        question: {
          select: {
            id: true,
            question_name: true,
            question_link: true,
            platform: true,
            level: true,
            progress: {
              where: {
                student_id: studentId
              },
              select: {
                id: true
              }
            }
          }
        }
      },
      orderBy,
      skip: dbSkip,
      take: dbTake
    }) as Array<{
      id: number;
      student_id: number;
      question_id: number;
      description: string | null;
      created_at: Date;
      updated_at: Date;
      question: {
        id: number;
        question_name: string;
        question_link: string;
        platform: string;
        level: string;
        progress: Array<{ id: number }>;
      };
    }>;

    // Format bookmarks with isSolved computed in JS
    let formattedBookmarks = bookmarks.map(bookmark => ({
      id: bookmark.id,
      question: bookmark.question,
      description: bookmark.description,
      created_at: bookmark.created_at,
      isSolved: bookmark.question.progress.length > 0
    }));

    // JS-LEVEL FILTER: Apply solved/unsolved filter in memory (fast for typical bookmark counts)
    if (filter === 'solved') {
      formattedBookmarks = formattedBookmarks.filter(b => b.isSolved);
    } else if (filter === 'unsolved') {
      formattedBookmarks = formattedBookmarks.filter(b => !b.isSolved);
    }

    // JS-LEVEL SORT: Apply solved/unsolved sorting in memory
    if (sort === 'solved') {
      // Solved first, then by created_at desc
      formattedBookmarks.sort((a, b) => {
        if (a.isSolved === b.isSolved) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return a.isSolved ? -1 : 1;
      });
    } else if (sort === 'unsolved') {
      // Unsolved first, then by created_at desc
      formattedBookmarks.sort((a, b) => {
        if (a.isSolved === b.isSolved) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return a.isSolved ? 1 : -1;
      });
    }

    // Apply pagination in JS if we were filtering/sorting in JS
    let paginatedBookmarks = formattedBookmarks;
    if (needsJsFilter || needsJsSort) {
      paginatedBookmarks = formattedBookmarks.slice(skip, skip + take);
    }

    // Calculate pagination info
    // For filtered results, total is approximate (based on all bookmarks)
    // For accurate filtered total, we'd need to scan all bookmarks
    const effectiveTotal = needsJsFilter ? formattedBookmarks.length : totalCount;
    const totalPages = Math.ceil(effectiveTotal / take);
    const hasNextPage = Number(page) < totalPages;
    const hasPreviousPage = Number(page) > 1;

    const result = {
      bookmarks: paginatedBookmarks,
      pagination: {
        page: Number(page),
        limit: take,
        total: effectiveTotal,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    };

    // 3. Cache result with modern Redis SET syntax (avoid duplicate JSON.stringify)
    const serializedResult = JSON.stringify(result);
    await setWithTTL(cacheKey, serializedResult, CACHE_TTL.studentBookmarks);
    
    console.log('=== CACHE STORAGE ===');
    console.log(`[CACHE STORE] bookmarks for student ${studentId}`);
    console.log(`Cache Key: ${cacheKey}`);
    console.log(`TTL: ${CACHE_TTL.studentBookmarks} seconds (${CACHE_TTL.studentBookmarks/60} minutes)`);
    console.log(`Data Source: Database Query -> Cached in Redis`);
    console.log('====================');

    return result;

  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Student not found");
      }
    }
    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to fetch bookmarks");
  }
};
