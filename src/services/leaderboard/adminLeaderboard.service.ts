import prisma from "../../config/prisma";
import {
  buildLeaderboardBaseQuery,
  buildSelectClause,
  buildFromClause,
  normalizeLeaderboardRow,
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

    // Build base query
    const { whereClause, orderByClause, params, nextParamIndex } = 
      buildLeaderboardBaseQuery(effectiveFilters);

    const selectClause = buildSelectClause();
    const fromClause = buildFromClause();

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
      LIMIT $${nextParamIndex} OFFSET $${nextParamIndex + 1}
    `;

    // Execute count and data queries in parallel
    const [countResult, leaderboardData] = await Promise.all([
      prisma.$queryRawUnsafe(countQuery, ...params),
      prisma.$queryRawUnsafe(dataQuery, ...params, limit, offset),
    ]);

    const total = Number((countResult as any[])[0]?.total || 0);
    const leaderboard = (leaderboardData as any[]).map(normalizeLeaderboardRow);

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
