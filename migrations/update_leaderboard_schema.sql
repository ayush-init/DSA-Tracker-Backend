-- Migration: Update Leaderboard table to optimal architecture
-- Step 1: Remove old columns
ALTER TABLE "Leaderboard" DROP COLUMN IF EXISTS filters_hash;
ALTER TABLE "Leaderboard" DROP COLUMN IF EXISTS cached_data;
ALTER TABLE "Leaderboard" DROP COLUMN IF EXISTS last_updated;
ALTER TABLE "Leaderboard" DROP COLUMN IF EXISTS batch_id;
ALTER TABLE "Leaderboard" DROP COLUMN IF EXISTS hard_count;
ALTER TABLE "Leaderboard" DROP COLUMN IF EXISTS medium_count;
ALTER TABLE "Leaderboard" DROP COLUMN IF EXISTS easy_count;
ALTER TABLE "Leaderboard" DROP COLUMN IF EXISTS hard_completion;
ALTER TABLE "Leaderboard" DROP COLUMN IF EXISTS medium_completion;
ALTER TABLE "Leaderboard" DROP COLUMN IF EXISTS easy_completion;
ALTER TABLE "Leaderboard" DROP COLUMN IF EXISTS total_solved;

-- Step 2: Add new columns
ALTER TABLE "Leaderboard" ADD COLUMN hard_solved INTEGER DEFAULT 0;
ALTER TABLE "Leaderboard" ADD COLUMN medium_solved INTEGER DEFAULT 0;
ALTER TABLE "Leaderboard" ADD COLUMN easy_solved INTEGER DEFAULT 0;
ALTER TABLE "Leaderboard" ADD COLUMN current_streak INTEGER DEFAULT 0;
ALTER TABLE "Leaderboard" ADD COLUMN score DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE "Leaderboard" ADD COLUMN global_rank INTEGER;
ALTER TABLE "Leaderboard" ADD COLUMN city_rank INTEGER;

-- Step 3: Update primary key to student_id
ALTER TABLE "Leaderboard" DROP CONSTRAINT IF EXISTS leaderboard_pkey;
ALTER TABLE "Leaderboard" ADD PRIMARY KEY (student_id);

-- Step 4: Add new indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_global_rank ON "Leaderboard"(global_rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_city_rank ON "Leaderboard"(city_rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON "Leaderboard"(score);
CREATE INDEX IF NOT EXISTS idx_leaderboard_last_calculated ON "Leaderboard"(last_calculated);

-- Step 5: Add comments for documentation
COMMENT ON COLUMN "Leaderboard".student_id IS 'Primary key linking to Student table';
COMMENT ON COLUMN "Leaderboard".hard_solved IS 'Number of hard questions solved by student';
COMMENT ON COLUMN "Leaderboard".medium_solved IS 'Number of medium questions solved by student';
COMMENT ON COLUMN "Leaderboard".easy_solved IS 'Number of easy questions solved by student';
COMMENT ON COLUMN "Leaderboard".current_streak IS 'Current consecutive days with submissions';
COMMENT ON COLUMN "Leaderboard".max_streak IS 'Maximum consecutive days with submissions';
COMMENT ON COLUMN "Leaderboard".score IS 'Calculated score based on completion percentages';
COMMENT ON COLUMN "Leaderboard".global_rank IS 'Student rank among all students';
COMMENT ON COLUMN "Leaderboard".city_rank IS 'Student rank within same city';
COMMENT ON COLUMN "Leaderboard".last_calculated IS 'When this data was last calculated';

-- Step 6: Update sequence
SELECT setval('leaderboard_schema_update', 1);
