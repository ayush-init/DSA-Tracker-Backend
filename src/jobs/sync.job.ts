import cron from "node-cron";
import { runStudentSyncWorker } from "../workers/sync.worker";
import { syncLeaderboardData } from "../services/leaderboardSync.service";

export function startSyncJob() {

  console.log("Sync cron job started");
  
  // 🚀 Combined sync job: Student Progress FIRST, then Leaderboard
  // cron.schedule("0 */4 * * *", async () => {
  cron.schedule("* * * * *", async () => {

    console.log("🔄 Starting combined sync cycle...");
    
    try {
      // Step 1: Update student progress first
      console.log("📚 Step 1: Syncing student progress...");
      const studentSyncStart = Date.now();
      await runStudentSyncWorker();
      const studentSyncDuration = Date.now() - studentSyncStart;
      console.log(`✅ Student progress sync completed in ${studentSyncDuration}ms`);
      
      // Step 2: Update leaderboard after student progress is complete
      console.log("🏆 Step 2: Updating leaderboard cache...");
      const leaderboardSyncStart = Date.now();
      await syncLeaderboardData();
      const leaderboardSyncDuration = Date.now() - leaderboardSyncStart;
      console.log(`✅ Leaderboard sync completed in ${leaderboardSyncDuration}ms`);
      
      const totalDuration = Date.now() - studentSyncStart;
      console.log(`🎉 Combined sync cycle completed successfully in ${totalDuration}ms`);
      
    } catch (error) {
      console.error("❌ Combined sync job failed:", error);
    }
  });

  console.log("✅ Sequential cron job started successfully");
  console.log("📅 Combined sync: Every 4 hours at minute 0 (Student Progress → Leaderboard)");
}