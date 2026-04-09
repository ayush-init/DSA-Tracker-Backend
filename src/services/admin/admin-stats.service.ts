import prisma from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

export const getAdminStatsService = async (batchId: number) => {
  // Check if batch exists
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      city: {
        select: {
          city_name: true
        }
      }
    }
  });

  if (!batch) {
    throw new ApiError(404, "Batch not found", [], "BATCH_NOT_FOUND");
  }

  // Parallelize independent count queries
  const [totalClassesResult, totalStudentsResult, totalTopicsResult, questionStatsResult] = await Promise.all([
    // Total classes for this batch
    prisma.class.count({
      where: { batch_id: batchId }
    }),

    // Total students for this batch
    prisma.student.count({
      where: { batch_id: batchId }
    }),

    // Total topics discussed (distinct topic_ids from classes in this batch)
    prisma.$queryRaw<{ count: BigInt }[]>`
      SELECT COUNT(DISTINCT topic_id) as count
      FROM "Class"
      WHERE batch_id = ${batchId}
    `,

    // All question aggregations in single SQL query with FILTER
    prisma.$queryRaw<{ total_questions: BigInt; homework: BigInt; classwork: BigInt; easy: BigInt; medium: BigInt; hard: BigInt; leetcode: BigInt; gfg: BigInt; other: BigInt; interviewbit: BigInt; }[]>`
      SELECT 
        COUNT(*) as total_questions,
        COUNT(*) FILTER (WHERE qv.type = 'HOMEWORK') as homework,
        COUNT(*) FILTER (WHERE qv.type = 'CLASSWORK') as classwork,
        COUNT(*) FILTER (WHERE q.level = 'EASY') as easy,
        COUNT(*) FILTER (WHERE q.level = 'MEDIUM') as medium,
        COUNT(*) FILTER (WHERE q.level = 'HARD') as hard,
        COUNT(*) FILTER (WHERE q.platform = 'LEETCODE') as leetcode,
        COUNT(*) FILTER (WHERE q.platform = 'GFG') as gfg,
        COUNT(*) FILTER (WHERE q.platform = 'OTHER') as other,
        COUNT(*) FILTER (WHERE q.platform = 'INTERVIEWBIT') as interviewbit
      FROM "QuestionVisibility" qv
      JOIN "Class" c ON qv.class_id = c.id
      JOIN "Question" q ON qv.question_id = q.id
      WHERE c.batch_id = ${batchId}
    `
  ]);

  // Convert BigInt results to Number (PostgreSQL COUNT returns BIGINT)
  const stats = questionStatsResult[0];

  return {
    batch_id: batchId,
    batch_name: batch.batch_name,
    city: batch.city.city_name,
    year: batch.year,
    total_classes: totalClassesResult,
    total_questions: Number(stats.total_questions),
    total_students: totalStudentsResult,
    questions_by_type: {
      homework: Number(stats.homework),
      classwork: Number(stats.classwork)
    },
    questions_by_level: {
      easy: Number(stats.easy),
      medium: Number(stats.medium),
      hard: Number(stats.hard)
    },
    questions_by_platform: {
      leetcode: Number(stats.leetcode),
      gfg: Number(stats.gfg),
      other: Number(stats.other),
      interviewbit: Number(stats.interviewbit)
    },
    total_topics_discussed: Number(totalTopicsResult[0].count)
  };
};
