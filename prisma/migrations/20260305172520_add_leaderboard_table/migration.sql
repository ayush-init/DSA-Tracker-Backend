-- CreateTable
CREATE TABLE "Leaderboard" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "completion_percentage" DOUBLE PRECISION NOT NULL,
    "hard_completion" DOUBLE PRECISION NOT NULL,
    "medium_completion" DOUBLE PRECISION NOT NULL,
    "easy_completion" DOUBLE PRECISION NOT NULL,
    "max_streak" INTEGER NOT NULL,
    "assigned_solved" INTEGER NOT NULL,
    "rank" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Leaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Leaderboard_batch_id_idx" ON "Leaderboard"("batch_id");

-- CreateIndex
CREATE INDEX "Leaderboard_rank_idx" ON "Leaderboard"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "Leaderboard_student_id_batch_id_key" ON "Leaderboard"("student_id", "batch_id");

-- AddForeignKey
ALTER TABLE "Leaderboard" ADD CONSTRAINT "Leaderboard_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leaderboard" ADD CONSTRAINT "Leaderboard_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
