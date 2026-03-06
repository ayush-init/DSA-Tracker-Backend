/*
  Warnings:

  - You are about to drop the column `batchId` on the `Leaderboard` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Leaderboard" DROP CONSTRAINT "Leaderboard_batchId_fkey";

-- AlterTable
ALTER TABLE "Leaderboard" DROP COLUMN "batchId";
