/*
  Warnings:

  - You are about to drop the column `solved_at` on the `StudentProgress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StudentProgress" DROP COLUMN "solved_at",
ADD COLUMN     "sync_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
