import cron from "node-cron";
import { runStudentSyncWorker } from "../workers/sync.worker";
import { syncLeaderboardData } from "../services/leaderboardSync.service";

export function startSyncJob() {

  console.log("Sync cron job started");
  
  // 🚀 Combined sync job: Student Progress FIRST, then Leaderboard
  cron.schedule("0 */4 * * *", async () => {
  // cron.schedule("* * * * *", async () => {

    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        console.log(`🔄 Starting combined sync cycle (attempt ${attempt + 1}/${maxRetries})...`);
        
        // Step 1: Update student progress first
        console.log("📚 Step 1: Syncing student progress...");
        const studentSyncStart = Date.now();
        await runStudentSyncWorker();
        const studentSyncDuration = Date.now() - studentSyncStart;
        console.log(`✅ Student progress sync completed in ${studentSyncDuration}ms`);
        
        // Step 2: Update leaderboard after student progress is complete
        console.log("🏆 Step 2: Updating leaderboard cache...");
        const leaderboardSyncStart = Date.now();
        const leaderboardResult = await syncLeaderboardData();
        const leaderboardSyncDuration = Date.now() - leaderboardSyncStart;
        console.log(`✅ Leaderboard sync completed in ${leaderboardSyncDuration}ms`);
        
        const totalDuration = Date.now() - studentSyncStart;
        console.log(`🎉 Combined sync cycle completed successfully in ${totalDuration}ms`);
        console.log(`📊 Processed ${leaderboardResult.studentsProcessed} students`);
        
        // Success, exit retry loop
        break;
        
      } catch (error) {
        attempt++;
        console.error(`❌ Sync attempt ${attempt} failed:`, error);
        
        if (attempt >= maxRetries) {
          console.error("❌ All sync attempts failed. Please investigate the issue.");
          // TODO: Add alert/notification system here
          break;
        }
        
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  });

  console.log("✅ Sequential cron job started successfully");
  console.log("📅 Combined sync: Every 4 hours at minute 0 (Student Progress → Leaderboard)");
  console.log("🔄 Retry logic: Up to 3 attempts with exponential backoff");
}