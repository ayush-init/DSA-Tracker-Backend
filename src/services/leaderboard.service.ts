import prisma from "../config/prisma";

export const getAvailableYears = async () => {
  const years = await prisma.batch.findMany({
    select: { year: true },
    distinct: ['year'],
    orderBy: { year: 'desc' }
  });
  return years.map(y => y.year);
};

export const getAvailableCities = async () => {
  const cities = await prisma.city.findMany({
    select: { city_name: true },
    orderBy: { city_name: 'asc' }
  });
  return cities.map(c => c.city_name);
};

// New function to get city-year mapping
export const getCityYearMapping = async () => {
  try {
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
    
    console.log("Executing city-year mapping query:", query);
    const results = await prisma.$queryRawUnsafe(query) as Array<{
      city_name: string;
      year: number;
    }>;
    
    console.log("City-year mapping query results:", results);
    
    // Group by city
    const cityMap: { [key: string]: number[] } = {};
    results.forEach((row: any) => {
      if (!cityMap[row.city_name]) {
        cityMap[row.city_name] = [];
      }
      if (!cityMap[row.city_name].includes(row.year)) {
        cityMap[row.city_name].push(row.year);
      }
    });
    
    // Get all available years
    const availableYears = await getAvailableYears();
    
    // Convert to array format with "All Cities" included
    const cityYearArray = [
      { city_name: "All Cities", available_years: availableYears },
      ...Object.entries(cityMap)
        .map(([city, years]: [string, number[]]) => ({
          city_name: city,
          available_years: [...new Set(years)].sort((a: number, b: number) => b - a)
        }))
        .sort((a: any, b: any) => {
          // Put "All Cities" first, then sort alphabetically
          if (a.city_name === "All Cities") return -1;
          if (b.city_name === "All Cities") return 1;
          return a.city_name.localeCompare(b.city_name);
        })
    ];
    
    console.log("Final city-year array:", cityYearArray);
    return cityYearArray;
    
  } catch (error) {
    console.error("Error in getCityYearMapping:", error);
    throw error;
  }
};


export const getLeaderboardWithPagination = async (filters: any, pagination: any, search: string | null) => {
    try {
        let { type = "all", city = "all", year = null } = filters;
        const { page = 1, limit = 20 } = pagination;

        // Validate type parameter
        const validTypes = ["all", "weekly", "monthly"];
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid type parameter. Must be one of: ${validTypes.join(", ")}`);
        }

        // Validate year parameter - get from database
        const validYears = await getAvailableYears();
        if (year && year !== "all" && !validYears.includes(year)) {
            throw new Error(`Invalid year parameter. Must be one of: ${validYears.join(", ")}`);
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

        // Dynamic rank selection based on time period
        let globalRankField = "l.alltime_global_rank";
        let cityRankField = "l.alltime_city_rank";
        
        if (type === "weekly") {
            globalRankField = "l.weekly_global_rank";
            cityRankField = "l.weekly_city_rank";
        } else if (type === "monthly") {
            globalRankField = "l.monthly_global_rank";
            cityRankField = "l.monthly_city_rank";
        }

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
                ROUND(
                    (l.hard_solved::numeric / NULLIF(b.hard_assigned,0) * 20)*100 +
                    (l.medium_solved::numeric / NULLIF(b.medium_assigned,0) * 15)*100 +
                    (l.easy_solved::numeric / NULLIF(b.easy_assigned,0) * 10)*100, 2
                ) AS score,
                -- Completion percentages
                ROUND((l.hard_solved::numeric / NULLIF(b.hard_assigned,0) * 100), 2) AS hard_completion,
                ROUND((l.medium_solved::numeric / NULLIF(b.medium_assigned,0) * 100), 2) AS medium_completion,
                ROUND((l.easy_solved::numeric / NULLIF(b.easy_assigned,0) * 100), 2) AS easy_completion,
                -- All time-based rankings
                l.weekly_global_rank,
                l.weekly_city_rank,
                l.monthly_global_rank,
                l.monthly_city_rank,
                l.alltime_global_rank,
                l.alltime_city_rank,
                l.last_calculated
            FROM "Student" s
            JOIN "Batch" b ON b.id = s.batch_id
            JOIN "City" c ON c.id = s.city_id
            JOIN "Leaderboard" l ON l.student_id = s.id
            ${whereClause}
            ORDER BY ${globalRankField}
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
            hard_completion: Number(row.hard_completion) || 0,
            medium_completion: Number(row.medium_completion) || 0,
            easy_completion: Number(row.easy_completion) || 0,
            score: Number(row.score) || 0,
            // All time-based rankings
            weekly_global_rank: Number(row.weekly_global_rank),
            weekly_city_rank: Number(row.weekly_city_rank),
            monthly_global_rank: Number(row.monthly_global_rank),
            monthly_city_rank: Number(row.monthly_city_rank),
            alltime_global_rank: Number(row.alltime_global_rank),
            alltime_city_rank: Number(row.alltime_city_rank),
            last_calculated: row.last_calculated
        }));

        // 🆕 Get cities and years data with error handling
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
            // 🆕 Additional data for frontend
            available_cities: availableCities,
            last_calculated: (leaderboardData as any[])[0]?.last_calculated || new Date().toISOString()
        };

    } catch (error) {
        console.error("Leaderboard pagination error:", error);
        
        // Provide detailed error information
        if (error instanceof Error) {
            // Check for specific database errors
            if (error.message.includes('parameter')) {
                throw new Error(`Database query parameter error: ${error.message}. This usually indicates a problem with SQL parameter binding.`);
            } else if (error.message.includes('42P02')) {
                throw new Error(`Database parameter error: Invalid parameter placeholder in SQL query. Please check the query construction.`);
            } else if (error.message.includes('42703')) {
                throw new Error(`Database column error: A referenced column does not exist. ${error.message}`);
            } else if (error.message.includes('42P01')) {
                throw new Error(`Database table error: A referenced table does not exist. ${error.message}`);
            } else {
                throw new Error(`Leaderboard pagination error: ${error.message}`);
            }
        } else {
            throw new Error(`Unknown leaderboard pagination error: ${String(error)}`);
        }
    }
};

export const getStudentRankDirect = async (studentId: number, filters: any) => {
    try {
        const { type = "all", city = "all", year } = filters;
        
        // Dynamic rank selection based on time period
        let rankField = "l.alltime_global_rank";
        let cityRankField = "l.alltime_city_rank";
        
        if (type === "weekly") {
            rankField = "l.weekly_global_rank";
            cityRankField = "l.weekly_city_rank";
        } else if (type === "monthly") {
            rankField = "l.monthly_global_rank";
            cityRankField = "l.monthly_city_rank";
        }

        const params: any[] = [studentId, year];
        let cityFilter = "";
        
        if (city && city !== "all") {
            cityFilter = `AND c.city_name = $${params.length+1}`;
            params.push(city);
        }
        
        const query = `
            SELECT l.alltime_global_rank as global_rank, l.alltime_city_rank as city_rank,
                   s.name, s.username,s.profile_image_url, c.city_name, b.year,
                   l.hard_solved, l.medium_solved, l.easy_solved,
                   l.current_streak, l.max_streak,
                   l.hard_solved + l.medium_solved + l.easy_solved AS total_solved,
                   b.hard_assigned, b.medium_assigned, b.easy_assigned,
                   ROUND(
                       (l.hard_solved::numeric / NULLIF(b.hard_assigned,0) * 20) +
                       (l.medium_solved::numeric / NULLIF(b.medium_assigned,0) * 15) +
                       (l.easy_solved::numeric / NULLIF(b.easy_assigned,0) * 10), 2
                   ) AS score,
                   ROUND((l.hard_solved::numeric / NULLIF(b.hard_assigned,0) * 100)*100, 2) AS hard_completion,
                   ROUND((l.medium_solved::numeric / NULLIF(b.medium_assigned,0) * 100), 2) AS medium_completion,
                   ROUND((l.easy_solved::numeric / NULLIF(b.easy_assigned,0) * 100), 2) AS easy_completion
            FROM "Leaderboard" l
            JOIN "Student" s ON s.id = l.student_id
            JOIN "Batch" b ON b.id = s.batch_id
            JOIN "City" c ON c.id = s.city_id
            WHERE l.student_id = $1 AND b.year = $2 ${cityFilter}
        `;
        
        const result = await prisma.$queryRawUnsafe(query, ...params);
        const studentData = (result as any[])[0] || null;
        
        // 🆕 Get cities and years data for student leaderboard
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
                throw new Error(`Database query parameter error: ${error.message}. This usually indicates a problem with SQL parameter binding.`);
            } else if (error.message.includes('42P02')) {
                throw new Error(`Database parameter error: Invalid parameter placeholder in SQL query. Please check the query construction.`);
            } else if (error.message.includes('42703')) {
                throw new Error(`Database column error: A referenced column does not exist. ${error.message}`);
            } else if (error.message.includes('42P01')) {
                throw new Error(`Database table error: A referenced table does not exist. ${error.message}`);
            } else {
                throw new Error(`Student rank lookup error: ${error.message}`);
            }
        } else {
            throw new Error(`Unknown student rank lookup error: ${String(error)}`);
        }
    }
};
