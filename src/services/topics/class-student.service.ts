import prisma from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

// Student-specific service - get class details with full questions array
interface GetClassDetailsWithFullQuestionsInput {
  studentId: number;
  batchId: number;
  topicSlug: string;
  classSlug: string;
  query?: any;
}

// Request deduplication cache
const requestCache = new Map<string, Promise<any>>();

export const getClassDetailsWithFullQuestionsService = async ({
  studentId,
  batchId,
  topicSlug,
  classSlug,
  query,
}: GetClassDetailsWithFullQuestionsInput) => {
  
  // Create unique request key
  const requestKey = `${studentId}-${batchId}-${topicSlug}-${classSlug}-${JSON.stringify(query || {})}`;
  
  // Check if request is already in progress
  if (requestCache.has(requestKey)) {
    return requestCache.get(requestKey);
  }
  
  // Create the main promise and cache it
  const requestPromise = (async () => {
    try {
      // Extract pagination parameters
      const page = parseInt(query?.page as string) || 1;
      const limit = parseInt(query?.limit as string) || 10;
      const skip = (page - 1) * limit;
      const filter = query?.filter as string;
      
      // Query 1: Fetch topic by slug (no JOIN)
      const topic = await prisma.topic.findUnique({
        where: { slug: topicSlug },
        select: {
          id: true,
          topic_name: true,
          slug: true
        }
      });

      if (!topic) {
        throw new ApiError(400, "Topic not found");
      }

      // Query 2: Fetch class using topic_id (no JOIN)
      const classData = await prisma.class.findFirst({
        where: {
          slug: classSlug,
          batch_id: batchId,
          topic_id: topic.id
        },
        select: {
          id: true,
          class_name: true,
          slug: true,
          description: true,
          duration_minutes: true,
          pdf_url: true,
          class_date: true,
          created_at: true
        }
      });

      if (!classData) {
        throw new ApiError(400, "Class not found");
      }

      // Query 3: Fetch paginated questionVisibility IDs
      const questionVisibilityData = await prisma.questionVisibility.findMany({
        where: { class_id: classData.id },
        select: {
          question_id: true
        },
        skip,
        take: limit,
        orderBy: { question_id: 'asc' }
      });

      // Extract question IDs
      const questionIds = questionVisibilityData.map(qv => qv.question_id);
      
      // Parallel queries: Question data, Student Progress, Bookmarks, and Total Count
      const [questionsData, visibilityData, studentProgress, studentBookmarks, totalQuestions] = await Promise.all([
        // Fetch question data
        prisma.question.findMany({
          where: {
            id: { in: questionIds }
          },
          select: {
            id: true,
            question_name: true,
            question_link: true,
            platform: true,
            level: true,
            topic_id: true
          }
        }),
        // Fetch visibility data for type
        prisma.questionVisibility.findMany({
          where: {
            class_id: classData.id,
            question_id: { in: questionIds }
          },
          select: {
            question_id: true,
            type: true
          }
        }),
        // Fetch student progress
        prisma.studentProgress.findMany({
          where: {
            student_id: studentId,
            question_id: { in: questionIds }
          },
          select: {
            question_id: true,
            sync_at: true
          }
        }),
        // Fetch bookmarks
        prisma.bookmark.findMany({
          where: {
            student_id: studentId,
            question_id: { in: questionIds }
          },
          select: {
            question_id: true
          }
        }),
        // Simple count query (no JOIN)
        prisma.questionVisibility.count({
          where: { class_id: classData.id }
        })
      ]);


      // Create lookup maps
      const questionMap = new Map(
        questionsData.map(q => [q.id, q])
      );

      const visibilityMap = new Map(
        visibilityData.map(v => [v.question_id, v.type])
      );
      
      const progressMap = new Map(
        studentProgress.map(progress => [progress.question_id, progress.sync_at])
      );

      const bookmarkMap = new Map(
        studentBookmarks.map(bookmark => [bookmark.question_id, true])
      );

      // Format questions with progress data
      const questionsWithProgress = questionVisibilityData.map((qv) => {
        const question = questionMap.get(qv.question_id);
        if (!question) {
          return null;
        }
        
        const questionId = question.id;
        const isSolved = progressMap.has(questionId);
        const isBookmarked = bookmarkMap.has(questionId);
        
        return {
          id: question.id,
          questionName: question.question_name,
          questionLink: question.question_link,
          platform: question.platform,
          level: question.level,
          type: visibilityMap.get(questionId) || 'HOMEWORK', // Get type from visibility
          topic: topic, // Use fetched topic
          isSolved,
          isBookmarked,
          syncAt: isSolved ? progressMap.get(questionId) : null
        };
      }).filter(Boolean);

      // Apply filtering in memory (only on paginated data)
      let filteredQuestions = questionsWithProgress;
      
      if (filter === 'solved') {
        filteredQuestions = questionsWithProgress.filter((q): q is NonNullable<typeof q> => q !== null && q.isSolved);
      } else if (filter === 'unsolved') {
        filteredQuestions = questionsWithProgress.filter((q): q is NonNullable<typeof q> => q !== null && !q.isSolved);
      }

      // Use solvedCount from already fetched studentProgress data
      const solvedCount = studentProgress.length;

      // Calculate filtered total for pagination
      let filteredTotal = totalQuestions;
      if (filter === 'solved' || filter === 'unsolved') {
        filteredTotal = filteredQuestions.length;
      }

      const totalPages = Math.ceil(filteredTotal / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      const result = {
        id: classData.id,
        class_name: classData.class_name,
        slug: classData.slug,
        description: classData.description,
        duration_minutes: classData.duration_minutes,
        pdf_url: classData.pdf_url,
        class_date: classData.class_date,
        created_at: classData.created_at,
        topic: topic,
        totalQuestions,
        solvedQuestions: solvedCount,
        questions: filteredQuestions,
        pagination: {
          total: filteredTotal,
          totalPages,
          page,
          limit,
          hasNext,
          hasPrev
        }
      };
      
      return result;
    } finally {
      // Clean up cache after request completes
      setTimeout(() => {
        requestCache.delete(requestKey);
      }, 1000); // Remove from cache after 1 second
    }
  })();
  
  // Cache the promise
  requestCache.set(requestKey, requestPromise);
  
  return requestPromise;
};
