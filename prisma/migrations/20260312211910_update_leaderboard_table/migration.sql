/*
  Warnings:

  - You are about to drop the column `city_rank` on the `Leaderboard` table. All the data in the column will be lost.
  - You are about to drop the column `global_rank` on the `Leaderboard` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Leaderboard_global_rank_idx";

-- AlterTable
ALTER TABLE "Leaderboard" DROP COLUMN "city_rank",
DROP COLUMN "global_rank",
ADD COLUMN     "alltime_city_rank" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "alltime_global_rank" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "monthly_city_rank" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "monthly_global_rank" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weekly_city_rank" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weekly_global_rank" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Leaderboard_weekly_global_rank_idx" ON "Leaderboard"("weekly_global_rank");

-- CreateIndex
CREATE INDEX "Leaderboard_monthly_global_rank_idx" ON "Leaderboard"("monthly_global_rank");

-- CreateIndex
CREATE INDEX "Leaderboard_alltime_global_rank_idx" ON "Leaderboard"("alltime_global_rank");

-- CreateIndex
CREATE INDEX "Leaderboard_max_streak_idx" ON "Leaderboard"("max_streak");
