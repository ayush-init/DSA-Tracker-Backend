-- Performance indexes for Leaderboard API optimization
-- Run this migration to add indexes that significantly improve query performance

-- Index for global rank lookups (most common sorting)
CREATE INDEX IF NOT EXISTS "idx_leaderboard_alltime_global_rank" 
  ON "Leaderboard"(alltime_global_rank);

-- Index for city rank lookups (when filtering by city)
CREATE INDEX IF NOT EXISTS "idx_leaderboard_alltime_city_rank" 
  ON "Leaderboard"(alltime_city_rank);

-- Index for student lookups (your rank queries)
CREATE INDEX IF NOT EXISTS "idx_leaderboard_student_id" 
  ON "Leaderboard"(student_id);

-- Composite index for efficient student+rank lookups
CREATE INDEX IF NOT EXISTS "idx_leaderboard_student_global_rank" 
  ON "Leaderboard"(student_id, alltime_global_rank);

-- Index for batch year filtering
CREATE INDEX IF NOT EXISTS "idx_batch_year" 
  ON "Batch"(year);

-- Index for city name filtering (admin queries)
CREATE INDEX IF NOT EXISTS "idx_city_city_name" 
  ON "City"(city_name);

-- Index for student batch relationship (for JOINs)
CREATE INDEX IF NOT EXISTS "idx_student_batch_id" 
  ON "Student"(batch_id);

-- Index for student city relationship (for JOINs)
CREATE INDEX IF NOT EXISTS "idx_student_city_id" 
  ON "Student"(city_id);

-- Composite index for city-year mapping queries
CREATE INDEX IF NOT EXISTS "idx_student_city_batch" 
  ON "Student"(city_id, batch_id);

-- Index for optimized city_id filtering (new - for student API)
CREATE INDEX IF NOT EXISTS "idx_leaderboard_city_filter" 
  ON "Student"(city_id, batch_id, id);
