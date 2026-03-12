/*
  Warnings:

  - The primary key for the `Leaderboard` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `easy_completion` on the `Leaderboard` table. All the data in the column will be lost.
  - You are about to drop the column `easy_count` on the `Leaderboard` table. All the data in the column will be lost.
  - You are about to drop the column `filters_hash` on the `Leaderboard` table. All the data in the column will be lost.
  - You are about to drop the column `hard_completion` on the `Leaderboard` table. All the data in the column will be lost.
  - You are about to drop the column `hard_count` on the `Leaderboard` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `Leaderboard` table. All the data in the column will be lost.
  - You are about to drop the column `medium_completion` on the `Leaderboard` table. All the data in the column will be lost.
  - You are about to drop the column `medium_count` on the `Leaderboard` table. All the data in the column will be lost.
  - You are about to drop the column `total_solved` on the `Leaderboard` table. All the data in the column will be lost.
  - Made the column `city_rank` on table `Leaderboard` required. This step will fail if there are existing NULL values in that column.
  - Made the column `global_rank` on table `Leaderboard` required. This step will fail if there are existing NULL values in that column.
  - Made the column `score` on table `Leaderboard` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Leaderboard_student_id_key";

-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "easy_assigned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hard_assigned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "medium_assigned" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Leaderboard" DROP CONSTRAINT "Leaderboard_pkey",
DROP COLUMN "easy_completion",
DROP COLUMN "easy_count",
DROP COLUMN "filters_hash",
DROP COLUMN "hard_completion",
DROP COLUMN "hard_count",
DROP COLUMN "id",
DROP COLUMN "medium_completion",
DROP COLUMN "medium_count",
DROP COLUMN "total_solved",
ADD COLUMN     "current_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "easy_solved" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hard_solved" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "medium_solved" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "city_rank" SET NOT NULL,
ALTER COLUMN "global_rank" SET NOT NULL,
ALTER COLUMN "score" SET NOT NULL,
ALTER COLUMN "score" SET DEFAULT 0.00,
ADD CONSTRAINT "Leaderboard_pkey" PRIMARY KEY ("student_id");
