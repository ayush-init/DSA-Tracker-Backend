"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSyncJob = startSyncJob;
const node_cron_1 = __importDefault(require("node-cron"));
const sync_worker_1 = require("../workers/sync.worker");
const leaderboardSync_service_1 = require("../services/leaderboardSync.service");
function startSyncJob() {
    console.log("Sync cron job started");
    // 🚀 Combined sync job: Student Progress FIRST, then Leaderboard
    // cron.schedule("0 */4 * * *", async () => {
    node_cron_1.default.schedule("* * * * *", async () => {
        console.log("🔄 Starting combined sync cycle...");
        try {
            // Step 1: Update student progress first
            console.log("📚 Step 1: Syncing student progress...");
            const studentSyncStart = Date.now();
            await (0, sync_worker_1.runStudentSyncWorker)();
            const studentSyncDuration = Date.now() - studentSyncStart;
            console.log(`✅ Student progress sync completed in ${studentSyncDuration}ms`);
            // Step 2: Update leaderboard after student progress is complete
            console.log("🏆 Step 2: Updating leaderboard cache...");
            const leaderboardSyncStart = Date.now();
            await (0, leaderboardSync_service_1.syncLeaderboardData)();
            const leaderboardSyncDuration = Date.now() - leaderboardSyncStart;
            console.log(`✅ Leaderboard sync completed in ${leaderboardSyncDuration}ms`);
            const totalDuration = Date.now() - studentSyncStart;
            console.log(`🎉 Combined sync cycle completed successfully in ${totalDuration}ms`);
        }
        catch (error) {
            console.error("❌ Combined sync job failed:", error);
        }
    });
    console.log("✅ Sequential cron job started successfully");
    console.log("📅 Combined sync: Every 4 hours at minute 0 (Student Progress → Leaderboard)");
}
