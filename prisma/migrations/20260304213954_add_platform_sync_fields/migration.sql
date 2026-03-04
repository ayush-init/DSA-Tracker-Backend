-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "gfg_total_solved" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_synced_at" TIMESTAMP(3),
ADD COLUMN     "lc_total_solved" INTEGER NOT NULL DEFAULT 0;
