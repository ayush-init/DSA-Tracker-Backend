import prisma from "../../config/prisma";
import {
  buildLeaderboardBaseQueryByCityId,
  getCachedCityYearMapping,
  handleLeaderboardError,
} from "./leaderboard.shared";

interface Filters {
  city?: string;
  year?: number;
}

interface Pagination {
  page: number;
  limit: number;
}

interface AdminLeaderboardResult {
  leaderboard: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  available_cities: Array<{ city_name: string; available_years: number[] }>;
  last_calculated: string;
}

/**
 * Get admin leaderboard with pagination
 */
export async function getAdminLeaderboard(
  filters: Filters,
  pagination: Pagination,
  search?: string
): Promise<AdminLeaderboardResult> {
  try {
    // Prepare effective filters
    const effectiveFilters = {
      city: filters.city || "all",
      year: filters.year || new Date().getFullYear(),
      search,
    };

    // Look up city ID from city name when a specific city is selected
    let effectiveCityId: number | undefined = undefined;
    if (effectiveFilters.city && effectiveFilters.city !== "all") {
      const cityRecord = await prisma.city.findFirst({
        where: { city_name: effectiveFilters.city },
        select: { id: true }
      });
      if (cityRecord) {
        effectiveCityId = cityRecord.id;
      }
    }

    // Build base query using city_id (integer comparison - much faster)
    const { whereClause, orderByClause, params } = buildLeaderboardBaseQueryByCityId(
      effectiveFilters.year,
      effectiveCityId,
      effectiveFilters.search
    );

    const selectClause = `
      SELECT 
        l.alltime_global_rank as global_rank,
        l.alltime_city_rank as city_rank,
        s.id as student_id,
        s.name,
        s.username,
        s.profile_image_url,
        c.city_name,
        b.year as batch_year,
        l.hard_solved,
        l.medium_solved,
        l.easy_solved,
        l.max_streak,
        l.hard_solved + l.medium_solved + l.easy_solved AS total_solved,
        b.hard_assigned,
        b.medium_assigned,
        b.easy_assigned,
        ROUND(
          (l.hard_solved::numeric / NULLIF(b.hard_assigned, 0) * 2000) +
          (l.medium_solved::numeric / NULLIF(b.medium_assigned, 0) * 1500) +
          (l.easy_solved::numeric / NULLIF(b.easy_assigned, 0) * 1000), 2
        ) AS score,
        l.last_calculated
    `;
    
    const fromClause = `
      FROM "Leaderboard" l
      JOIN "Student" s ON s.id = l.student_id
      JOIN "Batch" b ON b.id = s.batch_id
      JOIN "City" c ON c.id = s.city_id
    `;

    // Build count query - optimized to start from Leaderboard
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "Leaderboard" l
      JOIN "Student" s ON s.id = l.student_id
      JOIN "Batch" b ON b.id = s.batch_id
      JOIN "City" c ON c.id = s.city_id
      ${whereClause}
    `;

    // Build paginated data query
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;
    
    const dataQuery = `
      ${selectClause}
      ${fromClause}
      ${whereClause}
      ${orderByClause}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    // Execute count and data queries in parallel
    const [countResult, leaderboardData] = await Promise.all([
      prisma.$queryRawUnsafe(countQuery, ...params),
      prisma.$queryRawUnsafe(dataQuery, ...params, limit, offset),
    ]);

    const total = Number((countResult as any[])[0]?.total || 0);
    const leaderboard = (leaderboardData as any[]).map((row: any) => ({
      global_rank: Number(row.global_rank),
      city_rank: Number(row.city_rank),
      student_id: Number(row.student_id),
      name: row.name,
      username: row.username,
      profile_image_url: row.profile_image_url,
      city_name: row.city_name,
      batch_year: Number(row.batch_year),
      hard_solved: Number(row.hard_solved) || 0,
      medium_solved: Number(row.medium_solved) || 0,
      easy_solved: Number(row.easy_solved) || 0,
      max_streak: Number(row.max_streak) || 0,
      total_solved: Number(row.total_solved) || 0,
      score: Number(row.score) || 0,
      last_calculated: row.last_calculated
    }));

    // Get metadata (cached) in parallel
    const [availableCities, lastCalculated] = await Promise.all([
      getCachedCityYearMapping(),
      Promise.resolve(leaderboard[0]?.last_calculated || new Date().toISOString()),
    ]);

    return {
      leaderboard,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      available_cities: availableCities,
      last_calculated: lastCalculated,
    };
  } catch (error) {
    handleLeaderboardError(error, "Admin leaderboard");
  }
}
