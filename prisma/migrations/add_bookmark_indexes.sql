-- Migration: Add bookmark API performance indexes
-- For optimized GET /api/student/bookmarks queries
-- Run: npx prisma db execute --file prisma/migrations/add_bookmark_indexes.sql

-- =============================================================================
-- CRITICAL: For fast bookmark lookups by student with sorting by created_at
-- Query: SELECT * FROM "Bookmark" WHERE student_id = $1 ORDER BY created_at DESC
-- This replaces the need for separate index on student_id alone
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmark_student_created 
ON "Bookmark" (student_id, created_at DESC);

-- =============================================================================
-- NOTE: StudentProgress already has these indexes from previous migrations:
-- @@unique([student_id, question_id])  -> Unique constraint creates index automatically
-- @@index([student_id])
-- @@index([question_id])
-- @@index([student_id, question_id])     -- Redundant but already exists
-- =============================================================================

-- =============================================================================
-- VERIFY: Check if indexes were created successfully
-- =============================================================================
-- \di "idx_bookmark_student_created"
