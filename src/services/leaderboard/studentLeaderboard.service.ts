import prisma from "../../config/prisma";
import {
  buildLeaderboardBaseQueryByCityId,
  buildSelectClause,
  buildFromClause,
  normalizeLeaderboardRow,
  getCachedCityYearMapping,
  handleLeaderboardError,
} from "./leaderboard.shared";

interface JwtData {
  studentId: number;
  cityId: number;
  batchId: number;
  batchYear: number;
}

interface YourRankData {
  rank: number;
  student_id: number;
  name: string;
  username: string;
  profile_image_url: string | null;
  batch_year: number | null;
  city_name: string;
  max_streak: number;
  score: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  total_solved: number;
  total_assigned: number;
}

interface StudentLeaderboardResult {
  top10: any[];
  yourRank: YourRankData | null;
  message: string | null;
  filters: { city: string; year: number };
  available_cities: Array<{ city_name: string; available_years: number[] }>;
  last_calculated: string;
}

/**
 * Get student leaderboard with top 10 and personal rank
 * Uses JWT data to avoid extra Prisma queries
 */
export async function getStudentLeaderboard(
  jwtData: JwtData,
  filters: { city?: string; year?: number },
  search?: string
): Promise<StudentLeaderboardResult> {
  try {
    // Extract JWT data
    const { studentId, cityId, batchYear } = jwtData;
    
    // Determine effective filters
    const effectiveYear = filters.year || batchYear || new Date().getFullYear();
    const effectiveCityId = filters.city && filters.city !== "all" ? cityId : undefined;
    
    // Build base query using city_id (integer comparison - much faster)
    const { whereClause, orderByClause, params } = buildLeaderboardBaseQueryByCityId(
      effectiveYear,
      effectiveCityId,
      search
    );

    // Execute Top 10 query
    const selectClause = buildSelectClause();
    const fromClause = buildFromClause();
    
    const top10Query = `
      ${selectClause}
      ${fromClause}
      ${whereClause}
      ${orderByClause}
      LIMIT $${params.length + 1}
    `;
    
    const top10Data = await prisma.$queryRawUnsafe(top10Query, ...params, 10);
    const top10 = (top10Data as any[]).map(normalizeLeaderboardRow);

    // Execute "Your Rank" query using city_id filter
    const yourRankQuery = `
      SELECT 
        l.alltime_global_rank as global_rank,
        l.alltime_city_rank as city_rank,
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
        ) AS score
      FROM "Leaderboard" l
      JOIN "Student" s ON s.id = l.student_id
      JOIN "Batch" b ON b.id = s.batch_id
      JOIN "City" c ON c.id = s.city_id
      WHERE l.student_id = $1 AND b.year = $2
        ${effectiveCityId ? `AND s.city_id = $3` : ""}
    `;
    
    const yourRankParams: any[] = [studentId, effectiveYear];
    if (effectiveCityId) {
      yourRankParams.push(effectiveCityId);
    }
    
    const yourRankData = await prisma.$queryRawUnsafe(yourRankQuery, ...yourRankParams);
    const yourRankRaw = (yourRankData as any[])[0] || null;

    // Check if student exists and prepare response
    if (!yourRankRaw) {
      return {
        top10,
        yourRank: null,
        message: "Student rank not found in current filters",
        filters: {
          city: filters.city || "all",
          year: effectiveYear,
        },
        available_cities: await getCachedCityYearMapping(),
        last_calculated: top10[0]?.last_calculated || new Date().toISOString(),
      };
    }

    // Prepare your rank response using data from JOIN
    const isGlobalView = !effectiveCityId;
    
    const yourRank: YourRankData = {
      rank: isGlobalView ? yourRankRaw.global_rank : yourRankRaw.city_rank,
      student_id: studentId,
      name: yourRankRaw.name,
      username: yourRankRaw.username,
      profile_image_url: yourRankRaw.profile_image_url,
      batch_year: yourRankRaw.batch_year || null,
      city_name: yourRankRaw.city_name,
      max_streak: Number(yourRankRaw.max_streak) || 0,
      score: Number(yourRankRaw.score) || 0,
      easy_solved: Number(yourRankRaw.easy_solved) || 0,
      medium_solved: Number(yourRankRaw.medium_solved) || 0,
      hard_solved: Number(yourRankRaw.hard_solved) || 0,
      total_solved: Number(yourRankRaw.total_solved) || 0,
      total_assigned:
        (Number(yourRankRaw.hard_assigned) || 0) +
        (Number(yourRankRaw.medium_assigned) || 0) +
        (Number(yourRankRaw.easy_assigned) || 0),
    };

    // Get metadata (cached)
    const [availableCities, lastCalculated] = await Promise.all([
      getCachedCityYearMapping(),
      Promise.resolve(top10[0]?.last_calculated || new Date().toISOString()),
    ]);

    return {
      top10,
      yourRank,
      message: null,
      filters: {
        city: filters.city || "all",
        year: effectiveYear,
      },
      available_cities: availableCities,
      last_calculated: lastCalculated,
    };
  } catch (error) {
    handleLeaderboardError(error, "Student leaderboard");
  }
}
