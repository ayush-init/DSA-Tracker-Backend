import prisma from "../config/prisma";
import { fetchLeetcodeData } from "./leetcode.service";
import { fetchGfgData } from "./gfg.service";

function extractSlug(url: string): string | undefined {
  return url.split("/problems/")[1]?.split("/")[0];
}

export async function syncOneStudent(studentId: number, forceSync: boolean = false) {

  // 1️⃣ Load student + already solved progress
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      progress: {
        select: { question_id: true }
      }
    }
  });

  if (!student) throw new Error("Student not found");
  if (!student.batch_id) throw new Error("Student has no batch");

  // 2️⃣ Load batch curriculum in ONE query
  const batchClasses = await prisma.class.findMany({
    where: { batch_id: student.batch_id },
    include: {
      questionVisibility: {
        include: {
          question: {
            select: {
              id: true,
              question_link: true
            }
          }
        }
      }
    }
  });

  // 3️⃣ Build slug → questionId map
  const questionMap = new Map<string, number>();

  batchClasses.forEach(cls => {
    cls.questionVisibility.forEach(qv => {
      const slug = extractSlug(qv.question.question_link);
      if (slug) {
        questionMap.set(slug, qv.question.id);
      }
    });
  });

  // 4️⃣ Already solved set
  const solvedSet = new Set(
    student.progress.map(p => p.question_id)
  );

  const newProgressEntries: { student_id: number; question_id: number }[] = [];

  // ===============================
  // 🟡 LEETCODE
  // ===============================
  if (student.leetcode_id) {

    const lcData = await fetchLeetcodeData(student.leetcode_id);

    const shouldSyncLeetCode = forceSync || lcData.totalSolved > student.lc_total_solved;
    
    console.log("🔍 DEBUG: LeetCode Data:", {
      username: student.leetcode_id,
      totalSolved: lcData.totalSolved,
      studentTotalSolved: student.lc_total_solved,
      submissions: lcData.submissions.length,
      forceSync: forceSync,
      shouldSync: shouldSyncLeetCode
    });

    if (shouldSyncLeetCode) {

      lcData.submissions
        .filter(sub => sub.statusDisplay === "Accepted")
        .forEach(sub => {

          const questionId = questionMap.get(sub.titleSlug);

          if (questionId && !solvedSet.has(questionId)) {
            console.log("🔍 DEBUG: New LeetCode solution:", {
              titleSlug: sub.titleSlug,
              questionId: questionId
            });
            newProgressEntries.push({
              student_id: student.id,
              question_id: questionId
            });
            solvedSet.add(questionId);
          }
        });

      await prisma.student.update({
        where: { id: student.id },
        data: {
          lc_total_solved: lcData.totalSolved,
          last_synced_at: new Date()
        }
      });
    } else {
      console.log("🔍 DEBUG: LeetCode sync skipped - no new solved questions");
    }
  }

  // ===============================
  // 🔵 GFG
  // ===============================
  if (student.gfg_id) {

    const gfgData = await fetchGfgData(student.gfg_id);

    const shouldSyncGFG = forceSync || gfgData.totalSolved > student.gfg_total_solved;
    
    console.log("🔍 DEBUG: GFG Data:", {
      handle: student.gfg_id,
      totalSolved: gfgData.totalSolved,
      studentTotalSolved: student.gfg_total_solved,
      solvedSlugs: gfgData.solvedSlugs.length,
      forceSync: forceSync,
      shouldSync: shouldSyncGFG
    });

    if (shouldSyncGFG) {

      gfgData.solvedSlugs.forEach(slug => {

        const questionId = questionMap.get(slug);

        if (questionId && !solvedSet.has(questionId)) {
          console.log("🔍 DEBUG: New GFG solution:", {
            slug: slug,
            questionId: questionId
          });
          newProgressEntries.push({
            student_id: student.id,
            question_id: questionId
          });
          solvedSet.add(questionId);
        }
      });

      await prisma.student.update({
        where: { id: student.id },
        data: {
          gfg_total_solved: gfgData.totalSolved,
          last_synced_at: new Date()
        }
      });
    } else {
      console.log("🔍 DEBUG: GFG sync skipped - no new solved questions");
    }
  }

  // 5️⃣ Bulk Insert (Very Important Optimization)
  if (newProgressEntries.length > 0) {
    await prisma.studentProgress.createMany({
      data: newProgressEntries,
      skipDuplicates: true
    });
  }

  return {
    message: "Sync completed",
    newSolved: newProgressEntries.length,
    hadNewSolutions: newProgressEntries.length > 0,
    forceSyncUsed: forceSync
  };
}