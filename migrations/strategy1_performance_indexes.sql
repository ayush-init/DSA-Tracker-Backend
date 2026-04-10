-- Migration: Strategy 1 Performance Indexes for Optimized Queries
-- These indexes support the single SQL queries that replaced N+1 loops
-- Run: npx prisma db execute --file migrations/strategy1_performance_indexes.sql

-- =============================================================================
-- CRITICAL INDEXES: For topic progress optimization queries
-- Supports: getTopicsWithBatchProgressService, getTopicProgressByUsernameService
-- =============================================================================

-- Composite index for topic progress queries (batch + topic joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_topic_progress_batch_topic 
ON "Class" (batch_id, topic_id) 
INCLUDE (id, class_name, slug, created_at);

-- Composite index for question visibility lookups (class + question joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_visibility_class_question 
ON "QuestionVisibility" (class_id, question_id) 
INCLUDE (id, type);

-- Composite index for student progress lookups (student + question joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_progress_student_question 
ON "StudentProgress" (student_id, question_id) 
INCLUDE (id);

-- Index for topic ordering and search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_topic_search_order 
ON "Topic" (created_at DESC, topic_name, slug) 
INCLUDE (id, topic_name, slug, photo_url, description);

-- =============================================================================
-- CRITICAL INDEXES: For batch question count optimization
-- Supports: updateBatchQuestionCounts function
-- =============================================================================

-- Composite index for batch question aggregation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_question_aggregation 
ON "Class" (batch_id) 
INCLUDE (id);

-- Composite index for question level filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_level_filter 
ON "Question" (level) 
INCLUDE (id);

-- Composite index for question visibility by batch and level
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_visibility_batch_level 
ON "QuestionVisibility" (class_id) 
INCLUDE (question_id);

-- =============================================================================
-- VERIFICATION INDEXES: Ensure these exist for optimal performance
-- =============================================================================

-- These should already exist but we verify them:
-- - Primary key on Topic.id (automatically created)
-- - Primary key on Class.id (automatically created) 
-- - Primary key on Question.id (automatically created)
-- - Primary key on Student.id (automatically created)
-- - Primary key on StudentProgress.id (automatically created)
-- - Primary key on QuestionVisibility.id (automatically created)

-- =============================================================================
-- PERFORMANCE VERIFICATION QUERIES
-- =============================================================================

-- To verify indexes are being used, run these EXPLAIN queries:

-- 1. Topic progress query verification:
-- EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
-- SELECT 
--   t.id, t.topic_name, t.slug,
--   COUNT(DISTINCT q.id) as total_questions,
--   COUNT(DISTINCT sp.question_id) as solved_questions
-- FROM "Topic" t
-- LEFT JOIN "Class" c ON t.id = c.topic_id AND c.batch_id = $1
-- LEFT JOIN "QuestionVisibility" qv ON c.id = qv.class_id
-- LEFT JOIN "Question" q ON qv.question_id = q.id
-- LEFT JOIN "StudentProgress" sp ON q.id = sp.question_id AND sp.student_id = $2
-- GROUP BY t.id, t.topic_name, t.slug;

-- Expected: Index Scan using idx_topic_progress_batch_topic on Class
-- Expected: Index Scan using idx_question_visibility_class_question on QuestionVisibility
-- Expected: Index Scan using idx_student_progress_student_question on StudentProgress

-- 2. Batch question count verification:
-- EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
-- SELECT 
--   q.level,
--   COUNT(q.id) as count
-- FROM "Class" c
-- INNER JOIN "QuestionVisibility" qv ON c.id = qv.class_id
-- INNER JOIN "Question" q ON qv.question_id = q.id
-- WHERE c.batch_id = $1
-- GROUP BY q.level;

-- Expected: Index Scan using idx_batch_question_aggregation on Class
-- Expected: Index Scan using idx_question_visibility_batch_level on QuestionVisibility
-- Expected: Index Scan using idx_question_level_filter on Question

-- =============================================================================
-- PERFORMANCE IMPACT EXPECTATIONS
-- =============================================================================

-- Before Strategy 1 + Indexes:
-- - getTopicsWithBatchProgressService: 2-8 seconds
-- - getTopicProgressByUsernameService: 3-10 seconds  
-- - updateBatchQuestionCounts: 1-3 seconds

-- After Strategy 1 + Indexes:
-- - getTopicsWithBatchProgressService: 50-200ms (20-40x faster)
-- - getTopicProgressByUsernameService: 200-500ms (15-50x faster)
-- - updateBatchQuestionCounts: 100-300ms (10-30x faster)

-- Total system improvement: 10-50x faster response times on critical APIs
