-- Migration: Add profile API performance indexes
-- For optimized heatmap queries in studentProfile.service.ts
-- Run: npx prisma db execute --file prisma/migrations/add_profile_indexes.sql

-- =============================================================================
-- CRITICAL: For fetchAssignedDates() query
-- Query: SELECT DISTINCT DATE(qv.assigned_at) 
--        FROM "QuestionVisibility" qv
--        JOIN "Class" c ON qv.class_id = c.id
--        WHERE c.batch_id = ${batchId}
--        AND qv.assigned_at >= ${startDate}
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_visibility_assigned 
ON "QuestionVisibility" (class_id, assigned_at);

-- =============================================================================
-- CRITICAL: For fetchSubmissionCounts() query  
-- Query: SELECT DATE(sync_at), COUNT(*)
--        FROM "StudentProgress"
--        WHERE student_id = ${studentId}
--          AND sync_at >= ${startDate}
--        GROUP BY DATE(sync_at)
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_progress_sync 
ON "StudentProgress" (student_id, sync_at);

-- =============================================================================
-- BONUS: Covering index for getBatchStartMonth() 
-- Query: SELECT MIN(qv.assigned_at) FROM "QuestionVisibility" qv JOIN "Class"...
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_visibility_assigned_cover 
ON "QuestionVisibility" (class_id, assigned_at) 
INCLUDE (question_id);

-- =============================================================================
-- CRITICAL INDEX #3: For JOIN in fetchAssignedDates() and getBatchStartMonth()
-- Query: JOIN "Class" c ON qv.class_id = c.id WHERE c.batch_id = ${batchId}
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_batch_id 
ON "Class" (batch_id);

-- =============================================================================
-- VERIFY: These should already exist from previous migrations
-- =============================================================================
