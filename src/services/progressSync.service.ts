import prisma from "../config/prisma";
import { fetchLeetcodeData } from "./leetcode.service";
import { fetchGfgData } from "./gfg.service";

function extractSlug(url: string): string | undefined {
  return url.split("/problems/")[1]?.split("/")[0];
}

export async function syncOneStudent(studentId: number) {

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

    if (lcData.totalSolved > student.lc_total_solved) {

      lcData.submissions
        .filter(sub => sub.statusDisplay === "Accepted")
        .forEach(sub => {

          const questionId = questionMap.get(sub.titleSlug);

          if (questionId && !solvedSet.has(questionId)) {
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
    }
  }

  // ===============================
  // 🔵 GFG
  // ===============================
  if (student.gfg_id) {

    const gfgData = await fetchGfgData(student.gfg_id);

    if (gfgData.totalSolved > student.gfg_total_solved) {

      gfgData.solvedSlugs.forEach(slug => {

        const questionId = questionMap.get(slug);

        if (questionId && !solvedSet.has(questionId)) {
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
    newSolved: newProgressEntries.length
  };
}