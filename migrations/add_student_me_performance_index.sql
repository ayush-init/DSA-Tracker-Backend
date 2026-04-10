-- Migration: Add performance index for /api/students/me endpoint
-- Optimizes getCurrentStudentService query performance
-- Run: npx prisma db execute --file migrations/add_student_me_performance_index.sql

-- =============================================================================
-- CRITICAL INDEX: For getCurrentStudentService query with JOINs
-- Query: SELECT student.* JOIN city JOIN batch WHERE student.id = ?
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_me_optimized 
ON "Student" (id) 
INCLUDE (name, username, email, profile_image_url, leetcode_id, gfg_id, city_id, batch_id);

-- =============================================================================
-- VERIFY: These should already exist from previous migrations
-- =============================================================================
-- The following indexes should already exist but we verify them:
-- - Primary key on Student.id (automatically created)
-- - idx_city_name_lookup on City(city_name, id) 
-- - idx_batch_year_city on Batch(year, city_id, id)
-- - idx_student_batch_city_composite on Student(batch_id, city_id, id)

-- =============================================================================
-- PERFORMANCE VERIFICATION
-- =============================================================================
-- To verify the index is being used, run:
-- EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
-- SELECT 
--   s.id, s.name, s.username, s.email, s.profile_image_url, s.leetcode_id, s.gfg_id,
--   c.id, c.city_name,
--   b.id, b.batch_name, b.year
-- FROM "Student" s
-- LEFT JOIN "City" c ON s.city_id = c.id  
-- LEFT JOIN "Batch" b ON s.batch_id = b.id
-- WHERE s.id = ?;

-- Expected: Index Scan using idx_student_me_optimized on Student
