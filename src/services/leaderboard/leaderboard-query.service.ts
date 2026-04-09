import prisma from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { getAvailableYears, getCityYearMapping } from "./leaderboard-data.service";

export const getLeaderboardWithPagination = async (filters: any, pagination: any, search: string | null) => {
    try {
        let { city = "all", year = null } = filters;
        const { page = 1, limit = 20 } = pagination;

        // Validate year parameter - get from database
        const validYears = await getAvailableYears();
        if (year && year !== "all" && !validYears.includes(year)) {
            throw new ApiError(400, `Invalid year parameter. Must be one of: ${validYears.join(", ")}`);
        }
        
        // Year filter is required for meaningful comparison
        if (!year || year === "all") {
            // Default to current year if no year specified
            year = new Date().getFullYear();
            if (!validYears.includes(year)) {
                year = validYears[0]; // Fallback to most recent year
            }
        }
        
        // If there's no valid year (empty DB), gracefully return an empty set.
        if (!year) {
            return {
                leaderboard: [],
                pagination: { page, limit, total: 0, totalPages: 0 }
            };
        }

        // Always use all-time rankings
        let globalRankField = "l.alltime_global_rank";
        let cityRankField = "l.alltime_city_rank";

        // Build filters - year is now always required
        const params: any[] = [];
        let whereClause = `WHERE b.year = $1`;
        params.push(year);
        let paramIndex = 2;
        
        if (city && city !== "all") {
            whereClause += ` AND c.city_name = $${paramIndex}`;
            params.push(city);
            paramIndex++;
        }
        
        if (search) {
            whereClause += ` AND (s.name ILIKE $${paramIndex} OR s.username ILIKE $${paramIndex + 1})`;
            params.push(`%${search}%`, `%${search}%`);
            paramIndex += 2;
        }

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM "Student" s
            JOIN "Batch" b ON b.id = s.batch_id
            JOIN "City" c ON c.id = s.city_id
            JOIN "Leaderboard" l ON l.student_id = s.id
            ${whereClause}
        `;
        
        const totalCount = await prisma.$queryRawUnsafe(countQuery, ...params);
        const total = Number((totalCount as any[])[0]?.total || 0);

        // Get leaderboard data
        const leaderboardQuery = `
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
                -- Dynamic score calculation
             round(   (l.hard_solved::numeric / NULLIF(b.hard_assigned,0) * 2000) +
                (l.medium_solved::numeric / NULLIF(b.medium_assigned,0) * 1500) +
                (l.easy_solved::numeric / NULLIF(b.easy_assigned,0) * 1000),2) AS score,
                -- All-time rankings
                l.alltime_global_rank,
                l.alltime_city_rank,
                l.last_calculated
            FROM "Student" s
            JOIN "Batch" b ON b.id = s.batch_id
            JOIN "City" c ON c.id = s.city_id
            JOIN "Leaderboard" l ON l.student_id = s.id
            ${whereClause}
            ORDER BY ${city && city !== "all" ? cityRankField : globalRankField}
            LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `;

        const leaderboardData = await prisma.$queryRawUnsafe(leaderboardQuery, ...params);

        // Normalize results
        const normalized = (leaderboardData as any[]).map((row) => ({
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
            // All-time rankings
            alltime_global_rank: Number(row.alltime_global_rank),
            alltime_city_rank: Number(row.alltime_city_rank),
            last_calculated: row.last_calculated
        }));

        //  Get cities and years data with error handling
        let availableCities = [];
        let availableYears = [];
        
        try {
          availableCities = await getCityYearMapping();
        } catch (error) {
          console.error("Error getting city-year mapping:", error);
          // Fallback to empty array
          availableCities = [{ city_name: "All Cities", available_years: [new Date().getFullYear()] }];
        }
        
        try {
          availableYears = await getAvailableYears();
        } catch (error) {
          console.error("Error getting available years:", error);
          // Fallback to current year
          availableYears = [new Date().getFullYear()];
        }

        return {
            leaderboard: normalized,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            //  Additional data for frontend
            available_cities: availableCities,
            last_calculated: (leaderboardData as any[])[0]?.last_calculated || new Date().toISOString()
        };

    } catch (error) {
        console.error("Leaderboard pagination error:", error);
        
        // Provide detailed error information
        if (error instanceof Error) {
            // Check for specific database errors
            if (error.message.includes('parameter')) {
                throw new ApiError(400, `Database query parameter error: ${error.message}. This usually indicates a problem with SQL parameter binding.`);
            } else if (error.message.includes('42P02')) {
                throw new ApiError(400, `Database parameter error: Invalid parameter placeholder in SQL query. Please check the query construction.`);
            } else if (error.message.includes('42703')) {
                throw new ApiError(400, `Database column error: A referenced column does not exist. ${error.message}`);
            } else if (error.message.includes('42P01')) {
                throw new ApiError(400, `Database table error: A referenced table does not exist. ${error.message}`);
            } else {
                throw new ApiError(400, `Leaderboard pagination error: ${error.message}`);
            }
        } else {
            throw new ApiError(400, `Unknown leaderboard pagination error: ${String(error)}`);
        }
    }
};

export const getStudentRankDirect = async (studentId: number, filters: any) => {
    try {
        const { city, year } = filters;
        
        // Validate year parameter
        const validYears = await getAvailableYears();
        if (year && !validYears.includes(year)) {
            throw new ApiError(400, `Invalid year parameter. Must be one of: ${validYears.join(", ")}`);
        }
        
        // Always use all-time rankings
        let rankField = "l.alltime_global_rank";
        let cityRankField = "l.alltime_city_rank";

        const params: any[] = [studentId, year];
        let cityFilter = "";
        
        if (city && city !== "all") {
            cityFilter = `AND c.city_name = $${params.length+1}`;
            params.push(city);
        }
        
        const query = `
            SELECT ${rankField} as global_rank, ${cityRankField} as city_rank,
                   s.name, s.username,s.profile_image_url, c.city_name, b.year,
                   l.hard_solved, l.medium_solved, l.easy_solved,
                   l.current_streak, l.max_streak,
                   l.hard_solved + l.medium_solved + l.easy_solved AS total_solved,
                   b.hard_assigned, b.medium_assigned, b.easy_assigned,
                 round(  (l.hard_solved::numeric / NULLIF(b.hard_assigned,0) * 2000) +
                   (l.medium_solved::numeric / NULLIF(b.medium_assigned,0) * 1500) +
                   (l.easy_solved::numeric / NULLIF(b.easy_assigned,0) * 1000), 2) AS score
            FROM "Leaderboard" l
            JOIN "Student" s ON s.id = l.student_id
            JOIN "Batch" b ON b.id = s.batch_id
            JOIN "City" c ON c.id = s.city_id
            WHERE l.student_id = $1 AND b.year = $2 ${cityFilter}
        `;
        
        const result = await prisma.$queryRawUnsafe(query, ...params);
        const studentData = (result as any[])[0] || null;
        
        //  Get cities and years data for student leaderboard
        const availableCities = await getCityYearMapping();
        const availableYears = await getAvailableYears();
        
        // Return student data along with cities/years info
        return {
            ...studentData,
            available_cities: availableCities,
            available_years: availableYears
        };
        
    } catch (error) {
        console.error("Student rank lookup error:", error);
        
        // Provide detailed error information
        if (error instanceof Error) {
            // Check for specific database errors
            if (error.message.includes('parameter')) {
                throw new ApiError(400, `Database query parameter error: ${error.message}. This usually indicates a problem with SQL parameter binding.`);
            } else if (error.message.includes('42P02')) {
                throw new ApiError(400, `Database parameter error: Invalid parameter placeholder in SQL query. Please check the query construction.`);
            } else if (error.message.includes('42703')) {
                throw new ApiError(400, `Database column error: A referenced column does not exist. ${error.message}`);
            } else if (error.message.includes('42P01')) {
                throw new ApiError(400, `Database table error: A referenced table does not exist. ${error.message}`);
            } else {
                throw new ApiError(400, `Student rank lookup error: ${error.message}`);
            }
        } else {
            throw new ApiError(400, `Unknown student rank lookup error: ${String(error)}`);
        }
    }
};
