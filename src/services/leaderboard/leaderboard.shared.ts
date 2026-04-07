import prisma from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

// Cache configuration
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const metadataCache = {
  years: null as CacheEntry<number[]> | null,
  cityYearMap: null as CacheEntry<Array<{ city_name: string; available_years: number[] }>> | null,
};

interface Filters {
  city?: string;
  year?: number;
  search?: string;
}

interface BaseQueryResult {
  whereClause: string;
  orderByClause: string;
  params: any[];
  nextParamIndex: number;
}

/**
 * Build base WHERE and ORDER BY clauses using city_id (optimized for JWT data)
 */
export function buildLeaderboardBaseQueryByCityId(
  year: number,
  cityId?: number,
  search?: string
): BaseQueryResult {
  const params: any[] = [year];
  let whereClause = `WHERE b.year = $1`;
  let paramIndex = 2;
  let orderByClause = `ORDER BY l.alltime_global_rank ASC`;

  // City filter by ID (integer comparison - much faster than string)
  if (cityId && cityId > 0) {
    whereClause += ` AND s.city_id = $${paramIndex}`;
    params.push(cityId);
    paramIndex++;
    orderByClause = `ORDER BY l.alltime_city_rank ASC`;
  }

  // Search filter (optional)
  if (search) {
    whereClause += ` AND (s.name ILIKE $${paramIndex} OR s.username ILIKE $${paramIndex + 1})`;
    params.push(`%${search}%`, `%${search}%`);
    paramIndex += 2;
  }

  return {
    whereClause,
    orderByClause,
    params,
    nextParamIndex: paramIndex,
  };
}

/**
 * Build base WHERE and ORDER BY clauses for leaderboard queries (legacy, for admin)
 */
export function buildLeaderboardBaseQuery(filters: Filters): BaseQueryResult {
  const { city, year, search } = filters;
  
  // Year is required
  const effectiveYear = year || new Date().getFullYear();
  
  const params: any[] = [effectiveYear];
  let whereClause = `WHERE b.year = $1`;
  let paramIndex = 2;
  
  // City filter (optional) - by city_name for backward compatibility
  if (city && city !== "all") {
    whereClause += ` AND c.city_name = $${paramIndex}`;
    params.push(city);
    paramIndex++;
  }
  
  // Search filter (optional)
  if (search) {
    whereClause += ` AND (s.name ILIKE $${paramIndex} OR s.username ILIKE $${paramIndex + 1})`;
    params.push(`%${search}%`, `%${search}%`);
    paramIndex += 2;
  }
  
  // Order by logic: global rank for 'all', city rank for specific city
  const orderByClause = city && city !== "all"
    ? `ORDER BY l.alltime_city_rank ASC`
    : `ORDER BY l.alltime_global_rank ASC`;
  
  return {
    whereClause,
    orderByClause,
    params,
    nextParamIndex: paramIndex,
  };
}

/**
 * Get cached available years
 */
export async function getCachedYears(): Promise<number[]> {
  const now = Date.now();
  
  if (metadataCache.years && metadataCache.years.expiresAt > now) {
    return metadataCache.years.data;
  }
  
  const years = await prisma.batch.findMany({
    select: { year: true },
    distinct: ["year"],
    orderBy: { year: "desc" },
  });
  
  const yearList = years.map((y) => y.year);
  
  metadataCache.years = {
    data: yearList,
    expiresAt: now + CACHE_TTL,
  };
  
  return yearList;
}

/**
 * Get cached city-year mapping
 */
export async function getCachedCityYearMapping(): Promise<
  Array<{ city_name: string; available_years: number[] }>
> {
  const now = Date.now();
  
  if (metadataCache.cityYearMap && metadataCache.cityYearMap.expiresAt > now) {
    return metadataCache.cityYearMap.data;
  }
  
  const query = `
    SELECT DISTINCT
      c.city_name,
      b.year
    FROM "City" c
    JOIN "Student" s ON s.city_id = c.id
    JOIN "Batch" b ON b.id = s.batch_id
    WHERE s.id IS NOT NULL
      AND b.year IS NOT NULL
    ORDER BY c.city_name, b.year DESC
  `;
  
  const results = (await prisma.$queryRawUnsafe(query)) as Array<{
    city_name: string;
    year: number;
  }>;
  
  // Group by city
  const cityMap: { [key: string]: number[] } = {};
  results.forEach((row) => {
    if (!cityMap[row.city_name]) {
      cityMap[row.city_name] = [];
    }
    if (!cityMap[row.city_name].includes(row.year)) {
      cityMap[row.city_name].push(row.year);
    }
  });
  
  // Get all available years for "All Cities"
  const allYears = await getCachedYears();
  
  // Build final array
  const cityYearArray = [
    { city_name: "All Cities", available_years: allYears },
    ...Object.entries(cityMap)
      .map(([city_name, years]) => ({
        city_name,
        available_years: [...new Set(years)].sort((a, b) => b - a),
      }))
      .sort((a, b) => a.city_name.localeCompare(b.city_name)),
  ];
  
  metadataCache.cityYearMap = {
    data: cityYearArray,
    expiresAt: now + CACHE_TTL,
  };
  
  return cityYearArray;
}

/**
 * Get available years directly from DB (for validation)
 */
export async function getAvailableYears(): Promise<number[]> {
  return getCachedYears();
}

/**
 * Clear metadata cache (useful for testing or admin operations)
 */
export function clearMetadataCache(): void {
  metadataCache.years = null;
  metadataCache.cityYearMap = null;
}

/**
 * Build the SELECT clause for leaderboard queries
 */
export function buildSelectClause(): string {
  return `
    SELECT
      s.id AS student_id,
      s.name,
      s.username,
      s.profile_image_url,
      c.city_name,
      b.year AS batch_year,
      l.hard_solved,
      l.medium_solved,
      l.easy_solved,
      l.hard_solved + l.medium_solved + l.easy_solved AS total_solved,
      l.current_streak,
      l.max_streak,
      ROUND(
        (l.hard_solved::numeric / NULLIF(b.hard_assigned, 0) * 2000) +
        (l.medium_solved::numeric / NULLIF(b.medium_assigned, 0) * 1500) +
        (l.easy_solved::numeric / NULLIF(b.easy_assigned, 0) * 1000), 2
      ) AS score,
      l.alltime_global_rank,
      l.alltime_city_rank,
      l.last_calculated
  `;
}

/**
 * Build the FROM clause with JOINs - Optimized to start from Leaderboard
 */
export function buildFromClause(): string {
  return `
    FROM "Leaderboard" l
    JOIN "Student" s ON s.id = l.student_id
    JOIN "Batch" b ON b.id = s.batch_id
    JOIN "City" c ON c.id = s.city_id
  `;
}

/**
 * Normalize leaderboard row data
 */
export function normalizeLeaderboardRow(row: any): any {
  return {
    student_id: row.student_id,
    name: row.name,
    username: row.username,
    profile_image_url: row.profile_image_url,
    city_name: row.city_name,
    batch_year: row.batch_year,
    hard_solved: Number(row.hard_solved),
    medium_solved: Number(row.medium_solved),
    easy_solved: Number(row.easy_solved),
    total_solved: Number(row.total_solved),
    current_streak: Number(row.current_streak),
    max_streak: Number(row.max_streak),
    score: Number(row.score) || 0,
    alltime_global_rank: Number(row.alltime_global_rank),
    alltime_city_rank: Number(row.alltime_city_rank),
    last_calculated: row.last_calculated,
  };
}

/**
 * Handle database errors consistently
 */
export function handleLeaderboardError(error: any, context: string): never {
  console.error(`${context} error:`, error);
  
  if (error instanceof ApiError) {
    throw error;
  }
  
  if (error instanceof Error) {
    if (error.message.includes("parameter")) {
      throw new ApiError(
        400,
        `Database query parameter error: ${error.message}. This usually indicates a problem with SQL parameter binding.`
      );
    } else if (error.message.includes("42P02")) {
      throw new ApiError(
        400,
        `Database parameter error: Invalid parameter placeholder in SQL query. Please check the query construction.`
      );
    } else if (error.message.includes("42703")) {
      throw new ApiError(400, `Database column error: A referenced column does not exist. ${error.message}`);
    } else if (error.message.includes("42P01")) {
      throw new ApiError(400, `Database table error: A referenced table does not exist. ${error.message}`);
    } else {
      throw new ApiError(400, `${context} error: ${error.message}`);
    }
  }
  
  throw new ApiError(400, `Unknown ${context} error: ${String(error)}`);
}
