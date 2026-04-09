import cron from "node-cron";
import { runStudentSyncWorker } from "../workers/sync.worker";
import { syncLeaderboardData } from "../services/leaderboardSync/sync-core.service";

export function startSyncJob() {

  console.log("Sync cron job started");
  
  //  Combined sync job: Student Progress FIRST, then Leaderboard
cron.schedule("0 9,18,23 * * *", async () => {
// Runs: 9:00 AM, 18:00 (6 PM), 23:00 (11 PM)
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        console.log(` Starting combined sync cycle (attempt ${attempt + 1}/${maxRetries})...`);
        
        // Step 1: Update student progress first
        console.log("🎶🎶🎶🎶 Step 1: Syncing student progress...");
        const studentSyncStart = Date.now();
        await runStudentSyncWorker();
        const studentSyncDuration = Date.now() - studentSyncStart;
        console.log(` Student progress sync completed in ${studentSyncDuration}ms`);
        
        // Step 2: Update leaderboard after student progress is complete
        console.log(" Step 2: Updating leaderboard cache...");
        const leaderboardSyncStart = Date.now();
        const leaderboardResult = await syncLeaderboardData();
        const leaderboardSyncDuration = Date.now() - leaderboardSyncStart;
        console.log(`❤️❤️❤️❤️❤️❤️❤️ Leaderboard sync completed in ${leaderboardSyncDuration}ms`);

        const totalDuration = Date.now() - studentSyncStart;
        console.log(`❤️❤️❤️❤️❤️❤️❤️ Combined sync cycle completed successfully in ${totalDuration}ms`);
        console.log(`❤️❤️❤️❤️❤️❤️❤️ Processed ${leaderboardResult.studentsProcessed} students`);
        
        break;
        
      } catch (error) {
        attempt++;
        console.error(`Sync attempt ${attempt} failed:`, error);
        
        if (attempt >= maxRetries) {
          console.error("All sync attempts failed. Please investigate the issue.");
          // Alert/notification system for sync failures
          // Log critical failure for monitoring system
          console.error(`CRITICAL: Student sync failed after ${maxRetries} attempts`);
          
          // In production, this would trigger:
          // - Email/SMS alerts to administrators
          // - Monitoring system alerts
          // - Incident response team notification
          // For now, we log the critical error for monitoring
          break;
        }
        
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  });

  console.log("Sequential cron job started successfully");
  console.log("Combined sync: Every 4 hours at minute 0 (Student Progress → Leaderboard)");
  console.log("Retry logic: Up to 3 attempts with exponential backoff");
}