import prisma from "../../config/prisma";
import { fetchLeetcodeData } from "../external/leetcode.service";
import { fetchGfgData } from "../external/gfg.service";
import { ApiError } from "../../utils/ApiError";
import { extractSlug } from "./sync-utils.service";
import { CacheInvalidation } from "../../utils/cacheInvalidation";

interface BatchQuestionData {
  question_ids: number[];
  question_links: string[];
}

export async function syncOneStudent(
  studentId: number, 
  batchData?: BatchQuestionData,
  compareRealCount: boolean = true
) {

  // 1 Load student + already solved progress from StudentProgress table
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      progress: {
        select: { question_id: true }
      }
    }
  });
  
  if (!student) throw new ApiError(400, "Student not found");
  if (!student.batch_id) throw new ApiError(400, "Student has no batch");


  // 2 Get batch questions from memory store (no DB fallback)
  if (!batchData) {
    console.error(`[SYNC_CORE] Missing batch data for batch: ${student.batch_id}`);
    return {
      message: "Sync skipped - missing batch data",
      newSolved: 0,
      hadNewSolutions: false,
      compareRealCount: compareRealCount
    };
  }
  
  // Use pre-loaded batch data from memory (optimized)
  console.log(`[SYNC_CORE] Using pre-loaded batch data for batch ${student.batch_id}`);
  
  const questionMap = new Map<string, number>();
  batchData.question_links.forEach((link, index) => {
    const questionId = batchData.question_ids[index];
    if (questionId) {
      const slug = extractSlug(link);
      if (slug) {
        questionMap.set(slug, questionId);
      }
    }
  });


  // 4 Already solved set to avoid duplicate progress entries
  const solvedSet = new Set(
    student.progress.map(p => p.question_id)
  );


  const newProgressEntries: { student_id: number; question_id: number }[] = [];


  // ===============================
  // LEETCODE API INTEGRATION
  // ===============================
  if (student.leetcode_id) {
    
    // API Response Structure:
    // {
    //   totalSolved: 150,           // Total solved on LeetCode platform
    //   submissions: [              // Recent submissions array
    //     { titleSlug: "two-sum", statusDisplay: "Accepted" },
    //     { titleSlug: "add-two-numbers", statusDisplay: "Wrong Answer" },
    //     { titleSlug: "merge-sorted-array", statusDisplay: "Accepted" }
    //   ]
    // }
    const lcData = await fetchLeetcodeData(student.leetcode_id);


    // LOGIC BRANCH: Compare real counts or process everything
    let shouldProcessLeetcode = true;
    
    if (compareRealCount) {
      // Only process if student solved new questions on platform
      shouldProcessLeetcode = lcData.totalSolved > student.lc_total_solved;
    } else {
    }

    if (shouldProcessLeetcode) {
      // Process submissions - only "Accepted" ones count
      lcData.submissions
        .filter(sub => sub.statusDisplay === "Accepted")
        .forEach(sub => {
          
          // Match API slug with our question map
          const questionId = questionMap.get(sub.titleSlug);

          if (questionId && !solvedSet.has(questionId)) {
            
            newProgressEntries.push({
              student_id: student.id,
              question_id: questionId
            });
            solvedSet.add(questionId); // Add to solved set to avoid duplicates in this sync
          }
        });
    } else {
    }

    // Always update real count in Student table
    await prisma.student.update({
      where: { id: student.id },
      data: {
        lc_total_solved: lcData.totalSolved,
        last_synced_at: new Date()
      }
    });
  }

  // ===============================
  // GEEKSFORGEEKS API INTEGRATION
  // ===============================
  if (student.gfg_id) {
    
    // API Response Structure:
    // {
    //   totalSolved: 200,           // Total solved on GFG platform
    //   solvedSlugs: [              // Array of solved problem slugs
    //     "reverse-a-linked-list",
    //     "binary-search-tree",
    //     "dynamic-programming-knapsack"
    //   ]
    // }
    const gfgData = await fetchGfgData(student.gfg_id);


    // LOGIC BRANCH: Compare real counts or process everything
    let shouldProcessGfg = true;
    
    if (compareRealCount) {
      // Only process if student solved new questions on platform
      shouldProcessGfg = gfgData.totalSolved > student.gfg_total_solved;
    } else {
    }

    if (shouldProcessGfg) {
      // Process all solved slugs from GFG
      gfgData.solvedSlugs.forEach(slug => {
        
        // Match API slug with our question map
        const questionId = questionMap.get(slug);

        if (questionId && !solvedSet.has(questionId)) {
          
          newProgressEntries.push({
            student_id: student.id,
            question_id: questionId
          });
          solvedSet.add(questionId); // Add to solved set to avoid duplicates
        }
      });
    } else {
    }

    // Always update real count in Student table
    await prisma.student.update({
      where: { id: student.id },
      data: {
        gfg_total_solved: gfgData.totalSolved,
        last_synced_at: new Date()
      }
    });

  }

  // 5 Bulk Insert into StudentProgress table
  // Insert all new progress entries in one database query
  if (newProgressEntries.length > 0) {
    await prisma.studentProgress.createMany({
      data: newProgressEntries,
      skipDuplicates: true  // Safety net to prevent any duplicates
    });
    
    // Invalidate caches when student progress changes
    await CacheInvalidation.invalidateAssignedQuestions(); // Questions list affected
    await CacheInvalidation.invalidateTopics(); // Topics progress changed
    await CacheInvalidation.invalidateTopicOverviews(); // Topic overviews affected
    await CacheInvalidation.invalidateClassProgress(); // Class progress affected
    await CacheInvalidation.invalidateBookmarks(); // Bookmark status affected
    await CacheInvalidation.invalidateStudentProfile(studentId); // Student profile affected
    await CacheInvalidation.invalidateAllStudentProfiles(); // All profiles (ranks changed)
    await CacheInvalidation.invalidateAllLeaderboards(); // Leaderboard ranks change
  } else {
  }

  return {
    message: "Sync completed",
    newSolved: newProgressEntries.length,
    hadNewSolutions: newProgressEntries.length > 0,
    compareRealCount: compareRealCount  // Return which logic was used
  };
}
