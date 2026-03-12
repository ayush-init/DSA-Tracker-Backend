-- Migration: Add assigned question counts to Batch table
-- Step 1: Add columns to Batch table
ALTER TABLE "Batch" ADD COLUMN hard_assigned INTEGER DEFAULT 0;
ALTER TABLE "Batch" ADD COLUMN medium_assigned INTEGER DEFAULT 0;
ALTER TABLE "Batch" ADD COLUMN easy_assigned INTEGER DEFAULT 0;

-- Step 2: Populate assigned question counts for existing batches
UPDATE "Batch" b SET 
  hard_assigned = (
    SELECT COUNT(DISTINCT q.id)
    FROM "QuestionVisibility" qv
    JOIN "Question" q ON qv.question_id = q.id
    JOIN "Class" c ON qv.class_id = c.id
    JOIN "Batch" b2 ON c.batch_id = b2.id
    WHERE b2.id = b.id AND q.level = 'HARD'
  ),
  medium_assigned = (
    SELECT COUNT(DISTINCT q.id)
    FROM "QuestionVisibility" qv
    JOIN "Question" q ON qv.question_id = q.id
    JOIN "Class" c ON qv.class_id = c.id
    JOIN "Batch" b2 ON c.batch_id = b2.id
    WHERE b2.id = b.id AND q.level = 'MEDIUM'
  ),
  easy_assigned = (
    SELECT COUNT(DISTINCT q.id)
    FROM "QuestionVisibility" qv
    JOIN "Question" q ON qv.question_id = q.id
    JOIN "Class" c ON qv.class_id = c.id
    JOIN "Batch" b2 ON c.batch_id = b2.id
    WHERE b2.id = b.id AND q.level = 'EASY'
  );

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_batch_hard_assigned ON "Batch"(hard_assigned);
CREATE INDEX IF NOT EXISTS idx_batch_medium_assigned ON "Batch"(medium_assigned);
CREATE INDEX IF NOT EXISTS idx_batch_easy_assigned ON "Batch"(easy_assigned);

-- Step 4: Add comments for documentation
COMMENT ON COLUMN "Batch".hard_assigned IS 'Total number of hard questions assigned to this batch';
COMMENT ON COLUMN "Batch".medium_assigned IS 'Total number of medium questions assigned to this batch';
COMMENT ON COLUMN "Batch".easy_assigned IS 'Total number of easy questions assigned to this batch';

-- Step 5: Update sequence
SELECT setval('batch_assigned_questions_migration', 1);
