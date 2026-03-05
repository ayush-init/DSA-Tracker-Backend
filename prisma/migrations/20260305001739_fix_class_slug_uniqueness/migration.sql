/*
  Warnings:

  - A unique constraint covering the columns `[topic_id,batch_id,slug]` on the table `Class` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Class_batch_id_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "Class_topic_id_batch_id_slug_key" ON "Class"("topic_id", "batch_id", "slug");
