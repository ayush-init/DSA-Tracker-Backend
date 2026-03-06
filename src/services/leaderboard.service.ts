import prisma from "../config/prisma";

export const getLeaderboardService = async (query: any) => {

    const { type, city, year } = query;

    try {

        let timeFilter = "";

        if (type === "weekly") {
            timeFilter = `AND sp.sync_at >= date_trunc('week', now())`;
        }

        if (type === "monthly") {
            timeFilter = `AND sp.sync_at >= date_trunc('month', now())`;
        }

        let cityFilter = "";
        let yearFilter = "";

        if (city && city !== "all") {
            cityFilter = `AND c.city_name = '${city}'`;
        }

        // Check if we should use year filter or fall back to all-time
        let useYearFilter = false;
        if (year) {
            // Filter by batch year instead of student progress year
            yearFilter = `AND b.year = ${year}`;
            useYearFilter = true;
        }

        const leaderboard = await prisma.$queryRawUnsafe(`

WITH assigned_questions AS (

  SELECT
    b.id AS batch_id,

    COUNT(*) FILTER (WHERE q.level='HARD')   AS hard_assigned,
    COUNT(*) FILTER (WHERE q.level='MEDIUM') AS medium_assigned,
    COUNT(*) FILTER (WHERE q.level='EASY')   AS easy_assigned

  FROM "QuestionVisibility" qv
  JOIN "Question" q ON q.id = qv.question_id
  JOIN "Class" c ON c.id = qv.class_id
  JOIN "Batch" b ON b.id = c.batch_id

  GROUP BY b.id

),

student_solves AS (

  SELECT

    sp.student_id,

    COUNT(*) FILTER (WHERE q.level='HARD')   AS hard_solved,
    COUNT(*) FILTER (WHERE q.level='MEDIUM') AS medium_solved,
    COUNT(*) FILTER (WHERE q.level='EASY')   AS easy_solved,

    COUNT(*) AS total_solved

  FROM "StudentProgress" sp
  JOIN "Question" q ON q.id = sp.question_id

  WHERE 1=1
  ${timeFilter}

  GROUP BY sp.student_id

),

final_stats AS (

  SELECT

    s.id AS student_id,
    s.name,
    s.username,

    c.city_name,

    b.year AS batch_year,

    COALESCE(ss.hard_solved,0)   AS hard_solved,
    COALESCE(ss.medium_solved,0) AS medium_solved,
    COALESCE(ss.easy_solved,0)   AS easy_solved,

    COALESCE(ss.total_solved,0) AS total_solved,

    aq.hard_assigned,
    aq.medium_assigned,
    aq.easy_assigned,

        -- compute rounded completion values; use total available questions if no assigned questions
        CASE
            WHEN aq.hard_assigned IS NULL OR aq.hard_assigned = 0 THEN 
                CASE 
                    WHEN (SELECT COUNT(*) FROM "Question" WHERE level='HARD') = 0 THEN 0
                    ELSE ROUND((COALESCE(ss.hard_solved,0)::numeric / (SELECT COUNT(*) FROM "Question" WHERE level='HARD')::numeric) * 100, 2)
                END
            ELSE ROUND((COALESCE(ss.hard_solved,0)::numeric / aq.hard_assigned::numeric) * 100, 2)
        END AS hard_completion,

        CASE
            WHEN aq.medium_assigned IS NULL OR aq.medium_assigned = 0 THEN 
                CASE 
                    WHEN (SELECT COUNT(*) FROM "Question" WHERE level='MEDIUM') = 0 THEN 0
                    ELSE ROUND((COALESCE(ss.medium_solved,0)::numeric / (SELECT COUNT(*) FROM "Question" WHERE level='MEDIUM')::numeric) * 100, 2)
                END
            ELSE ROUND((COALESCE(ss.medium_solved,0)::numeric / aq.medium_assigned::numeric) * 100, 2)
        END AS medium_completion,

        CASE
            WHEN aq.easy_assigned IS NULL OR aq.easy_assigned = 0 THEN 
                CASE 
                    WHEN (SELECT COUNT(*) FROM "Question" WHERE level='EASY') = 0 THEN 0
                    ELSE ROUND((COALESCE(ss.easy_solved,0)::numeric / (SELECT COUNT(*) FROM "Question" WHERE level='EASY')::numeric) * 100, 2)
                END
            ELSE ROUND((COALESCE(ss.easy_solved,0)::numeric / aq.easy_assigned::numeric) * 100, 2)
        END AS easy_completion,

        -- compute score based on completion percentage
        ROUND(
            (COALESCE(ss.hard_solved,0)::numeric / NULLIF(aq.hard_assigned,0) * 20) +
            (COALESCE(ss.medium_solved,0)::numeric / NULLIF(aq.medium_assigned,0) * 15) +
            (COALESCE(ss.easy_solved,0)::numeric / NULLIF(aq.easy_assigned,0) * 10), 2
        ) AS score,

    COALESCE(l.max_streak, 0) AS max_streak

  FROM "Student" s

  JOIN "Batch" b
    ON b.id = s.batch_id

  JOIN "City" c
    ON c.id = s.city_id

  JOIN "Leaderboard" l
    ON l.student_id = s.id

  LEFT JOIN student_solves ss
    ON ss.student_id = s.id

  LEFT JOIN assigned_questions aq
    ON aq.batch_id = b.id

  WHERE 1=1
  ${cityFilter}
  ${yearFilter}

)

SELECT

  ROW_NUMBER() OVER (
    ORDER BY score DESC,
             hard_completion DESC,
             medium_completion DESC,
             easy_completion DESC,
             max_streak DESC,
             total_solved DESC
  ) AS global_rank,

  ROW_NUMBER() OVER (
    PARTITION BY city_name
    ORDER BY score DESC,
             hard_completion DESC,
             medium_completion DESC,
             easy_completion DESC,
             max_streak DESC,
             total_solved DESC
  ) AS city_rank,

  student_id,
  name,
  username,
  city_name,
  batch_year AS year,

  hard_completion,
  medium_completion,
  easy_completion,

  score,

  max_streak,
  total_solved

FROM final_stats

ORDER BY global_rank
LIMIT 100

`);

        // Normalize results: convert BigInt and Decimal-like values to JS-friendly types
        const normalized = (leaderboard as any[]).map((row) => {
            const out: any = {};
            for (const key of Object.keys(row)) {
                const val = (row as any)[key];

                if (typeof val === "bigint") {
                    out[key] = Number(val);
                    continue;
                }

                // Prisma numeric/decimal values may have toNumber()
                if (val && typeof val === "object" && typeof (val as any).toNumber === "function") {
                    try {
                        out[key] = (val as any).toNumber();
                        continue;
                    } catch {
                        out[key] = (val as any).toString();
                        continue;
                    }
                }

                out[key] = val;
            }
            // Add year from batch data
            out.year = row.year;
            return out;
        });

        return normalized;

    } catch (error) {
        console.log(error instanceof Error ? error.message : String(error))
        console.error("Leaderboard error:", error);
        throw new Error(error instanceof Error ? error.message : String(error));

    }

};


export const recalculateLeaderboardService = async () => {

    const students = await prisma.student.findMany({
        where: {
            batch_id: { not: null }
        },
        select: {
            id: true
        }
    });

    for (const student of students) {

        const solved = await prisma.studentProgress.findMany({
            where: { student_id: student.id },
            include: {
                question: {
                    select: {
                        level: true
                    }
                }
            },
            orderBy: {
                sync_at: "asc"
            }
        });

        let hard = 0;
        let medium = 0;
        let easy = 0;

        solved.forEach((s) => {

            if (s.question.level === "HARD") hard++;
            if (s.question.level === "MEDIUM") medium++;
            if (s.question.level === "EASY") easy++;

        });

        // Score is now calculated in real-time in the query, no need to store it

        // ---- MAX STREAK CALCULATION ----

        let currentStreak = 0;
        let maxStreak = 0;

        let prevDate: string | null = null;

        const uniqueDates = new Set<string>();

        solved.forEach((s) => {
            const date = s.sync_at.toISOString().split("T")[0];
            uniqueDates.add(date);
        });

        const dates = Array.from(uniqueDates).sort();

        for (let i = 0; i < dates.length; i++) {

            if (i === 0) {
                currentStreak = 1;
            } else {

                const prev = new Date(dates[i - 1]);
                const curr = new Date(dates[i]);

                const diff =
                    (curr.getTime() - prev.getTime()) /
                    (1000 * 60 * 60 * 24);

                if (diff === 1) {
                    currentStreak++;
                } else {
                    currentStreak = 1;
                }

            }

            maxStreak = Math.max(maxStreak, currentStreak);

        }

        await prisma.leaderboard.upsert({
            where: {
                student_id: student.id
            },
            update: {
                hard_count: hard,
                medium_count: medium,
                easy_count: easy,
                max_streak: maxStreak
            },
            create: {
                student_id: student.id,
                hard_count: hard,
                medium_count: medium,
                easy_count: easy,
                max_streak: maxStreak
            }
        });

    }

};