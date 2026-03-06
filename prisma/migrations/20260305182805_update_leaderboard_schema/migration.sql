/*
  Warnings:

  - You are about to drop the column `assigned_solved` on the `Leaderboard` table. All the data in the column will be lost.
  - You are about to drop the column `batch_id` on the `Leaderboard` table. All the data in the column will be lost.
  - You are about to drop the column `completion_percentage` on the `Leaderboard` table. All the data in the column will be lost.
  - You are about to drop the column `easy_completion` on the `Leaderboard` table. All the data in the column will be lost.
  - You are about to drop the column `hard_completion` on the `Leaderboard` table. All the data in the column will be lost.
  - You are about to drop the column `medium_completion` on the `Leaderboard` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[student_id]` on the table `Leaderboard` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Leaderboard" DROP CONSTRAINT "Leaderboard_batch_id_fkey";

-- DropForeignKey
ALTER TABLE "Leaderboard" DROP CONSTRAINT "Leaderboard_student_id_fkey";

-- DropIndex
DROP INDEX "Leaderboard_batch_id_idx";

-- DropIndex
DROP INDEX "Leaderboard_rank_idx";

-- DropIndex
DROP INDEX "Leaderboard_student_id_batch_id_key";

-- AlterTable
ALTER TABLE "Leaderboard" DROP COLUMN "assigned_solved",
DROP COLUMN "batch_id",
DROP COLUMN "completion_percentage",
DROP COLUMN "easy_completion",
DROP COLUMN "hard_completion",
DROP COLUMN "medium_completion",
ADD COLUMN     "batchId" INTEGER,
ADD COLUMN     "easy_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hard_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "medium_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "max_streak" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Leaderboard_student_id_key" ON "Leaderboard"("student_id");

-- AddForeignKey
ALTER TABLE "Leaderboard" ADD CONSTRAINT "Leaderboard_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leaderboard" ADD CONSTRAINT "Leaderboard_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
