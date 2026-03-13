"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncOneStudent = syncOneStudent;
const prisma_1 = __importDefault(require("../config/prisma"));
const leetcode_service_1 = require("./leetcode.service");
const gfg_service_1 = require("./gfg.service");
function extractSlug(url) {
    return url.split("/problems/")[1]?.split("/")[0];
}
async function syncOneStudent(studentId, forceSync = false) {
    // 1️⃣ Load student + already solved progress
    const student = await prisma_1.default.student.findUnique({
        where: { id: studentId },
        include: {
            progress: {
                select: { question_id: true }
            }
        }
    });
    if (!student)
        throw new Error("Student not found");
    if (!student.batch_id)
        throw new Error("Student has no batch");
    // 2️⃣ Load batch curriculum in ONE query
    const batchClasses = await prisma_1.default.class.findMany({
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
    const questionMap = new Map();
    batchClasses.forEach(cls => {
        cls.questionVisibility.forEach(qv => {
            const slug = extractSlug(qv.question.question_link);
            if (slug) {
                questionMap.set(slug, qv.question.id);
            }
        });
    });
    // 4️⃣ Already solved set
    const solvedSet = new Set(student.progress.map(p => p.question_id));
    const newProgressEntries = [];
    // ===============================
    // 🟡 LEETCODE
    // ===============================
    if (student.leetcode_id) {
        const lcData = await (0, leetcode_service_1.fetchLeetcodeData)(student.leetcode_id);
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
            await prisma_1.default.student.update({
                where: { id: student.id },
                data: {
                    lc_total_solved: lcData.totalSolved,
                    last_synced_at: new Date()
                }
            });
        }
        else {
            console.log("🔍 DEBUG: LeetCode sync skipped - no new solved questions");
        }
    }
    // ===============================
    // 🔵 GFG
    // ===============================
    if (student.gfg_id) {
        const gfgData = await (0, gfg_service_1.fetchGfgData)(student.gfg_id);
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
            await prisma_1.default.student.update({
                where: { id: student.id },
                data: {
                    gfg_total_solved: gfgData.totalSolved,
                    last_synced_at: new Date()
                }
            });
        }
        else {
            console.log("🔍 DEBUG: GFG sync skipped - no new solved questions");
        }
    }
    // 5️⃣ Bulk Insert (Very Important Optimization)
    if (newProgressEntries.length > 0) {
        await prisma_1.default.studentProgress.createMany({
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
