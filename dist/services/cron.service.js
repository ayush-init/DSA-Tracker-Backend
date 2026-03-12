"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerLeaderboardSync = exports.startCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const leaderboardSync_service_1 = require("../services/leaderboardSync.service");
// 🚀 Start Cron Jobs
const startCronJobs = () => {
    console.log('🕐 Starting cron jobs...');
    // Optional: Midnight leaderboard sync for additional daily refresh
    // This runs in addition to the combined sync in sync.job.ts
    node_cron_1.default.schedule('0 0 * * *', async () => {
        try {
            console.log('🌙 Running midnight leaderboard sync...');
            await (0, leaderboardSync_service_1.syncLeaderboardData)();
            console.log('✅ Midnight leaderboard sync completed');
        }
        catch (error) {
            console.error('❌ Midnight leaderboard sync failed:', error);
        }
    });
    console.log('✅ Cron jobs started successfully');
    console.log('📅 Additional midnight leaderboard sync: Daily at 12:00 AM');
    console.log('📅 Main combined sync: Every 4 hours (Student Progress → Leaderboard) - handled by sync.job.ts');
};
exports.startCronJobs = startCronJobs;
// Manual trigger for immediate sync
const triggerLeaderboardSync = async () => {
    try {
        console.log('🔄 Manual leaderboard sync triggered...');
        await (0, leaderboardSync_service_1.syncLeaderboardData)();
        console.log('✅ Manual leaderboard sync completed');
        return { success: true, message: 'Leaderboard sync completed successfully' };
    }
    catch (error) {
        console.error('❌ Manual leaderboard sync failed:', error);
        return { success: false, message: 'Leaderboard sync failed', error: error.message };
    }
};
exports.triggerLeaderboardSync = triggerLeaderboardSync;
