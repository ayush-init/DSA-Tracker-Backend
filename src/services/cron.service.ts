import cron from 'node-cron';
import { syncLeaderboardData } from '../services/leaderboardSync.service';

// 🚀 Start Cron Jobs
export const startCronJobs = () => {
    console.log('🕐 Starting cron jobs...');

    // Optional: Midnight leaderboard sync for additional daily refresh
    // This runs in addition to the combined sync in sync.job.ts
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('🌙 Running midnight leaderboard sync...');
            await syncLeaderboardData();
            console.log('✅ Midnight leaderboard sync completed');
        } catch (error) {
            console.error('❌ Midnight leaderboard sync failed:', error);
        }
    });

    console.log('✅ Cron jobs started successfully');
    console.log('📅 Additional midnight leaderboard sync: Daily at 12:00 AM');
    console.log('📅 Main combined sync: Every 4 hours (Student Progress → Leaderboard) - handled by sync.job.ts');
};

// Manual trigger for immediate sync
export const triggerLeaderboardSync = async () => {
    try {
        console.log('🔄 Manual leaderboard sync triggered...');
        await syncLeaderboardData();
        console.log('✅ Manual leaderboard sync completed');
        return { success: true, message: 'Leaderboard sync completed successfully' };
    } catch (error) {
        console.error('❌ Manual leaderboard sync failed:', error);
        return { success: false, message: 'Leaderboard sync failed', error: (error as any).message };
    }
};
