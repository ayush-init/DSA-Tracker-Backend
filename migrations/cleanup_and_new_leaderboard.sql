-- Migration: Clean up database and create new optimal leaderboard table
-- Step 1: Drop old leaderboard table completely
DROP TABLE IF EXISTS "Leaderboard";

-- Step 2: Create new optimal leaderboard table
CREATE TABLE "Leaderboard" (
  student_id INTEGER PRIMARY KEY,
  
  -- Raw counts (calculated from StudentProgress)
  hard_solved INTEGER DEFAULT 0,
  medium_solved INTEGER DEFAULT 0,
  easy_solved INTEGER DEFAULT 0,
  
  -- Streak data (calculated from StudentProgress)
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  
  -- Calculated metrics (stored for performance)
  score DECIMAL(10,2) DEFAULT 0.00,
  global_rank INTEGER,
  city_rank INTEGER,
  
  -- Metadata
  last_calculated TIMESTAMP DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_global_rank ON "Leaderboard"(global_rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_city_rank ON "Leaderboard"(city_rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON "Leaderboard"(score);
CREATE INDEX IF NOT EXISTS idx_leaderboard_last_calculated ON "Leaderboard"(last_calculated);

-- Step 4: Add comments for documentation
COMMENT ON TABLE "Leaderboard" IS 'Optimized leaderboard table with raw counts and calculated metrics';
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

-- Step 5: Update sequence
SELECT setval('leaderboard_cleanup_complete', 1);
