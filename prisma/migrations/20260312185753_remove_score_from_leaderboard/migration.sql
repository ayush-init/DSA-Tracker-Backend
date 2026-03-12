/*
  Warnings:

  - You are about to drop the column `score` on the `Leaderboard` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Leaderboard_score_idx";

-- AlterTable
ALTER TABLE "Leaderboard" DROP COLUMN "score";
