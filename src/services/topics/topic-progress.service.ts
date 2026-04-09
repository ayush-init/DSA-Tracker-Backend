import prisma from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from "../../utils/errorMapper";
import { QueryParams } from '../../types/common.types';
import { GetTopicsWithBatchProgressInput, GetTopicOverviewWithClassesSummaryInput } from "../../types/topic.types";

export const getTopicsWithBatchProgressService = async ({
  studentId,
  batchId,
  query,
}: GetTopicsWithBatchProgressInput) => {
  const page = parseInt(query?.page as string) || 1;
  const limit = parseInt(query?.limit as string) || 10;
  const search = query?.search as string;
  const sortBy = query?.sortBy || 'recent';
  const offset = (page - 1) * limit;

  // Build ORDER BY clause safely
  let orderByClause = 'ORDER BY last_class_created_at DESC NULLS LAST';
  if (sortBy === 'oldest') {
    orderByClause = 'ORDER BY last_class_created_at ASC NULLS LAST';
  } else if (sortBy === 'classes') {
    orderByClause = 'ORDER BY class_count DESC NULLS LAST, t.created_at DESC';
  } else if (sortBy === 'questions') {
    orderByClause = 'ORDER BY question_count DESC NULLS LAST, t.created_at DESC';
  } else if (sortBy === 'strongest') {
    orderByClause = 'ORDER BY progress_percentage DESC NULLS LAST, t.created_at DESC';
  } else if (sortBy === 'weakest') {
    orderByClause = 'ORDER BY progress_percentage ASC NULLS LAST, t.created_at DESC';
  }

  // Build queries dynamically based on search presence
  const searchParams: (string | number)[] = [batchId, studentId];
  const countParams: (string | number)[] = [batchId];

  let topicsQuery: string;
  let countQuery: string;

  if (search) {
    // With search: $1=batchId, $2=studentId, $3=searchName, $4=searchSlug, $5=limit, $6=offset
    const searchPattern = `%${search}%`;
    searchParams.push(searchPattern, searchPattern, limit, offset);
    countParams.push(searchPattern, searchPattern);

    topicsQuery = `
      SELECT 
        t.id,
        t.topic_name,
        t.slug,
        t.photo_url,
        t.created_at,
        t.updated_at,
        COUNT(DISTINCT c.id) as class_count,
        COUNT(DISTINCT q.id) as question_count,
        COUNT(DISTINCT CASE WHEN sp.student_id IS NOT NULL THEN q.id END) as solved_questions,
        MAX(c.created_at) as last_class_created_at,
        CASE 
          WHEN COUNT(DISTINCT q.id) = 0 THEN 0
          ELSE ROUND((COUNT(DISTINCT CASE WHEN sp.student_id IS NOT NULL THEN q.id END)::float / COUNT(DISTINCT q.id)) * 100)
        END as progress_percentage
      FROM "Topic" t
      LEFT JOIN "Class" c ON t.id = c.topic_id AND c.batch_id = $1
      LEFT JOIN "QuestionVisibility" qv ON c.id = qv.class_id
      LEFT JOIN "Question" q ON qv.question_id = q.id
      LEFT JOIN "StudentProgress" sp ON q.id = sp.question_id AND sp.student_id = $2
      WHERE 1=1 AND (t.topic_name ILIKE $3 OR t.slug ILIKE $4)
      GROUP BY t.id, t.topic_name, t.slug, t.photo_url, t.created_at, t.updated_at
      ${orderByClause}
      LIMIT $5 OFFSET $6
    `;

    countQuery = `
      SELECT COUNT(DISTINCT t.id) as total_count
      FROM "Topic" t
      LEFT JOIN "Class" c ON t.id = c.topic_id AND c.batch_id = $1
      WHERE 1=1 AND (t.topic_name ILIKE $2 OR t.slug ILIKE $3)
    `;
  } else {
    // Without search: $1=batchId, $2=studentId, $3=limit, $4=offset
    searchParams.push(limit, offset);

    topicsQuery = `
      SELECT 
        t.id,
        t.topic_name,
        t.slug,
        t.photo_url,
        t.created_at,
        t.updated_at,
        COUNT(DISTINCT c.id) as class_count,
        COUNT(DISTINCT q.id) as question_count,
        COUNT(DISTINCT CASE WHEN sp.student_id IS NOT NULL THEN q.id END) as solved_questions,
        MAX(c.created_at) as last_class_created_at,
        CASE 
          WHEN COUNT(DISTINCT q.id) = 0 THEN 0
          ELSE ROUND((COUNT(DISTINCT CASE WHEN sp.student_id IS NOT NULL THEN q.id END)::float / COUNT(DISTINCT q.id)) * 100)
        END as progress_percentage
      FROM "Topic" t
      LEFT JOIN "Class" c ON t.id = c.topic_id AND c.batch_id = $1
      LEFT JOIN "QuestionVisibility" qv ON c.id = qv.class_id
      LEFT JOIN "Question" q ON qv.question_id = q.id
      LEFT JOIN "StudentProgress" sp ON q.id = sp.question_id AND sp.student_id = $2
      WHERE 1=1
      GROUP BY t.id, t.topic_name, t.slug, t.photo_url, t.created_at, t.updated_at
      ${orderByClause}
      LIMIT $3 OFFSET $4
    `;

    countQuery = `
      SELECT COUNT(DISTINCT t.id) as total_count
      FROM "Topic" t
      LEFT JOIN "Class" c ON t.id = c.topic_id AND c.batch_id = $1
      WHERE 1=1
    `;
  }

  try {
    // Execute queries
    const topics = await prisma.$queryRawUnsafe(topicsQuery, ...searchParams) as any[];
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...countParams) as any[];

    const totalCount = Number(countResult[0]?.total_count) || 0;

    // Map SQL results to exact same response structure
    const mappedTopics = topics.map((topic: any) => ({
      id: topic.id.toString(),
      topic_name: topic.topic_name,
      slug: topic.slug,
      photo_url: topic.photo_url,
      created_at: topic.created_at,
      updated_at: topic.updated_at,
      classCount: Number(topic.class_count) || 0,
      questionCount: Number(topic.question_count) || 0,
      lastClassCreated_at: topic.last_class_created_at,
      batchSpecificData: {
        totalClasses: Number(topic.class_count) || 0,
        totalQuestions: Number(topic.question_count) || 0,
        solvedQuestions: Number(topic.solved_questions) || 0
      },
      progressPercentage: Number(topic.progress_percentage) || 0
    }));

    return {
      topics: mappedTopics,
      pagination: {
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        page,
        limit
      }
    };
  } catch (error: unknown) {
    console.error('Error in getTopicsWithBatchProgressService:', error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch topics with progress";
    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, errorMessage);
  }
};

export const getTopicOverviewWithClassesSummaryService = async ({
  studentId,
  batchId,
  topicSlug,
  query,
}: GetTopicOverviewWithClassesSummaryInput) => {
  
  const page = parseInt(query?.page as string) || 1;
  const limit = parseInt(query?.limit as string) || 10;
  const offset = (page - 1) * limit;

  // Get topic basic info first
  const topic = await prisma.topic.findFirst({
    where: { slug: topicSlug },
    select: {
      id: true,
      topic_name: true,
      slug: true,
      description: true,
      photo_url: true
    }
  });

  if (!topic) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Topic not found");
  }

  // SINGLE QUERY: Get paginated classes with aggregated data
  const classesData = await prisma.$queryRaw`
    SELECT 
      c.id,
      c.class_name,
      c.slug,
      c.description,
      c.pdf_url,
      c.class_date,
      c.created_at,
      COUNT(DISTINCT qv.question_id) as total_questions,
      COUNT(DISTINCT CASE WHEN sp.question_id IS NOT NULL THEN qv.question_id END) as solved_questions
    FROM "Class" c
    LEFT JOIN "QuestionVisibility" qv ON c.id = qv.class_id
    LEFT JOIN "StudentProgress" sp ON qv.question_id = sp.question_id AND sp.student_id = ${studentId}
    WHERE c.topic_id = ${topic.id} AND c.batch_id = ${batchId}
    GROUP BY c.id, c.class_name, c.slug, c.description, c.pdf_url, c.class_date, c.created_at
    ORDER BY c.created_at ASC
    LIMIT ${limit} OFFSET ${offset}
  ` as any[];

  // SINGLE QUERY: Get total classes count and overall progress
  const overallData = await prisma.$queryRaw`
    SELECT 
      COUNT(DISTINCT c.id) as total_classes,
      COUNT(DISTINCT q.id) as total_questions,
      COUNT(DISTINCT sp.question_id) as solved_questions
    FROM "Class" c
    INNER JOIN "QuestionVisibility" qv ON c.id = qv.class_id
    INNER JOIN "Question" q ON qv.question_id = q.id
    LEFT JOIN "StudentProgress" sp ON q.id = sp.question_id AND sp.student_id = ${studentId}
    WHERE c.topic_id = ${topic.id} AND c.batch_id = ${batchId}
  ` as any[];

  
  // Format classes data
  const classesSummary = classesData.map((cls: any) => ({
    id: cls.id,
    class_name: cls.class_name,
    slug: cls.slug,
    description: cls.description,
    pdf_url: cls.pdf_url,
    classDate: cls.class_date,
    totalQuestions: Number(cls.total_questions) || 0,
    solvedQuestions: Number(cls.solved_questions) || 0
  }));

  // Extract overall progress data
  const overall = overallData[0] || {};
  const totalClassesCount = Number(overall.total_classes) || 0;
  const totalTopicQuestions = Number(overall.total_questions) || 0;
  const totalSolvedQuestions = Number(overall.solved_questions) || 0;


  return {
    id: topic.id,
    topic_name: topic.topic_name,
    slug: topic.slug,
    description: topic.description || null,
    photo_url: topic.photo_url || null,
    classes: classesSummary,
    pagination: {
      total: totalClassesCount,
      totalPages: Math.ceil(totalClassesCount / limit),
      page,
      limit,
      hasNext: page < Math.ceil(totalClassesCount / limit),
      hasPrev: page > 1
    },
    overallProgress: {
      totalClasses: totalClassesCount,
      totalQuestions: totalTopicQuestions,
      solvedQuestions: totalSolvedQuestions
    }
  };
};

export const getTopicProgressByUsernameService = async (username: string) => {
  // Find the student by username
  const student = await prisma.student.findUnique({
    where: { username: username as string },
    include: {
      batch: true
    }
  });

  if (!student) {
    throw new ApiError(404, "Student not found", [], "STUDENT_NOT_FOUND");
  }
  if (!student.batch_id) {
    throw new ApiError(400, "Student is not assigned to any batch", [], "NO_BATCH_ASSIGNED");
  }
  // Get student progress to calculate solved questions
  const studentProgress = await prisma.studentProgress.findMany({
    where: { student_id: student.id }
  });

  // Get all topics with their classes
  const topics = await prisma.topic.findMany({
    include: {
      classes: {
        where: {
          batch_id: student.batch_id
        },
        include: {
          questionVisibility: {
            include: {
              question: {
                select: {
                  level: true,
                  platform: true
                }
              }
            }
          }
        }
      }
    }
  });

  // Calculate progress for each topic (same logic as controller)
  const topicsWithProgress = topics.map(topic => {
    const topicClasses = topic.classes;
    const totalQuestions = topicClasses.reduce((sum, classItem) => {
      return sum + classItem.questionVisibility.length;
    }, 0);

    const solvedQuestions = studentProgress.filter(progress => {
      return topicClasses.some(classItem =>
        classItem.questionVisibility.some(qv => qv.question_id === progress.question_id)
      );
    }).length;

    return {
      ...topic,
      totalQuestions,
      solvedQuestions,
      progressPercentage: totalQuestions > 0 ? Math.round((solvedQuestions / totalQuestions) * 100) : 0
    };
  });

  return {
    student: {
      id: student.id,
      name: student.name,
      username: student.username,
      batch: student.batch
    },
    topics: topicsWithProgress
  };
};
