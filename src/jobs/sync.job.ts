import cron from "node-cron";
import { runStudentSyncWorker } from "../workers/sync.worker";

export function startSyncJob() {

  console.log("Sync cron job started");
  // */1 * * * *
  cron.schedule("0 */4 * * *", async () => {
  // cron.schedule("*/1 * * * *", async () => {
  // cron.schedule("* * * * *", async () => {
    console.log("Running student progress sync...");

    try {
      await runStudentSyncWorker();
    } catch (error) {
      console.error("Sync job failed:", error);
    }

  });
}