import cron from "node-cron";
import prisma from "../config/prisma";
import { studentSyncQueue } from "../queues/studentSync.queue";
import { tryRunLeaderboard } from "../services/leaderboardSync/leaderboardWindow.service";
import { startSync, isSyncRunning } from "../utils/syncStatus";
import { setBatchQuestions } from "../store/batchQuestions.store";
import { LinkUpdateService } from "../services/linkUpdate/linkUpdate.service";

export function startSyncJob() {

  console.log("[CRON] Sync cron job system started");
  const ENABLE_CRON = true;


  if (ENABLE_CRON) {
    // Student Sync Cron: 5 AM, 2 PM, 8 PM
    // cron.schedule("0 5,14,20 * * *", async () => {
    // cron.schedule("*/1 * * * *", async () => {
      cron.schedule("10 01 * * *", async () => {
      const maxRetries = 3;
      let attempt = 0;
      let linkUpdateResults: { updated: number; skipped: number; failed: number; total: number } | null = null;

      while (attempt < maxRetries) {
        try {
          // Check if sync is already running
          if (isSyncRunning()) {
            console.log(`[CRON] Sync already running, skipping this cycle`);
            return;
          }

          console.log(`[CRON] Student sync cycle started (attempt ${attempt + 1}/${maxRetries})`);

          // Check if queue is empty before starting new sync
          const queueCount = await studentSyncQueue.count();
          if (queueCount > 0) {
            console.log(`[CRON] Queue not empty (${queueCount} jobs), skipping new sync`);
            return;
          }
  

          // Set sync status
          startSync();

          // STEP 1: Update all question links to handle redirects
          console.log(`[CRON] Starting question link update process...`);
          try {
            linkUpdateResults = await LinkUpdateService.updateAllQuestionLinks();
            LinkUpdateService.generateReport(linkUpdateResults);
          } catch (error) {
            console.error('[CRON] Question link update failed:', error);
          }

          // Load all batch questions once per sync cycle (after link updates)
          console.log(`[CRON] Loading batch questions for optimized sync`);
          const batchQuestionsQuery = await prisma.$queryRaw`
            WITH CTE_BatchQuestions AS (
              SELECT DISTINCT 
                b.id AS batch_id, 
                q.id AS question_id, 
                q.question_link
              FROM "Batch" b
              JOIN "Class" c ON c.batch_id = b.id
              JOIN "QuestionVisibility" qv ON qv.class_id = c.id
              JOIN "Question" q ON q.id = qv.question_id
              WHERE EXISTS (
                SELECT 1 FROM "Student" s WHERE s.batch_id = b.id
              )
            )
            SELECT 
              batch_id,
              array_agg(question_id) as question_ids,
              array_agg(question_link) as question_links
            FROM CTE_BatchQuestions
            GROUP BY batch_id
          ` as { batch_id: number; question_ids: number[]; question_links: string[] }[];

          // Convert to Map and store in memory
          const batchQuestionsMap = new Map<number, { question_ids: number[]; question_links: string[] }>();
          batchQuestionsQuery.forEach(batch => {
            batchQuestionsMap.set(batch.batch_id, {
              question_ids: batch.question_ids || [],
              question_links: batch.question_links || []
            });
          });

          setBatchQuestions(batchQuestionsMap);
          console.log(`[CRON] Loaded questions for ${batchQuestionsMap.size} batches`);

          // Get all students with batch assignments
          const students = await prisma.student.findMany({
            where: {
              batch_id: { not: null }
            },
            select: {
              id: true,
              batch_id: true
            }
          });

          console.log(`[CRON] Adding ${students.length} students to sync queue`);

          // Add all students to queue in bulk with batchId
          const jobs = students.map(student => ({
            name: 'sync-student',
            data: { studentId: student.id, batchId: student.batch_id },
            opts: {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 1000
              }
            }
          }));

          await studentSyncQueue.addBulk(jobs);
          console.log(`[CRON]❤️❤️❤️❤️ Successfully added ${students.length} students to sync queue`);

          // STEP 3: Generate final completion report after student sync
          console.log('\n=== CRON JOB COMPLETION REPORT ===');
          console.log(`Question Links Updated: ${linkUpdateResults ? linkUpdateResults.updated : 'N/A'}`);
          console.log(`Total Students Processed: ${students.length}`);
          console.log(`Students w/ New Solved Qs: [Will be calculated after sync completes]`);
          console.log(`Total New Questions Added: [Will be calculated after sync completes]`);
          console.log(`Students Skipped (Optimized): [Will be calculated after sync completes]`);
          console.log(`Students Failed / Errored: [Will be calculated after sync completes]`);
          console.log(`Sync Status: SUCCESS`);
          console.log(`Timestamp: ${new Date().toISOString()}`);
          console.log('==================================================');

          break;

        } catch (error) {
          attempt++;
          console.error(`[CRON] Student sync attempt ${attempt} failed:`, error);

          if (attempt >= maxRetries) {
            console.error("[CRON] All student sync attempts failed");
            break;
          }

          // Exponential backoff: 2s, 4s, 8s
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[CRON] Retrying student sync in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    });
  }

  // Leaderboard Sync Cron: 9 AM, 6 PM, 11 PM
  // cron.schedule("0 9,18,23 * * *", async () => {
  // cron.schedule("45 15 * * *", async () => {
    // cron.schedule("*/1 * * * *", async () => {
    cron.schedule("11 16 * * *", async () => {
    try {
      console.log("[CRON] Leaderboard sync cycle started");
      await tryRunLeaderboard();
      console.log("[CRON] Leaderboard sync cycle completed");
    } catch (error) {
      console.error("[CRON] Leaderboard sync failed:", error);
    }
  });

  console.log("[CRON] Student sync: 5 AM, 2 PM, 8 PM (0 5,14,20 * * *)");
  console.log("[CRON] Leaderboard sync: 9 AM, 6 PM, 11 PM (0 9,18,23 * * *)");
  console.log("[CRON] Queue-based system with rate limiting and retry logic initialized");
}