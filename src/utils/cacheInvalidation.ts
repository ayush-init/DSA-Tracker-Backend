import redis from '../config/redis';
import { deleteByPattern } from './redisUtils';

export class CacheInvalidation {
  
  // Student-specific invalidation
  static async invalidateStudent(studentId: number, batchId?: number) {
    // Delete specific student keys + all pattern-based caches
    const keys = [
      `student:profile:${studentId}`,
      `student:profile:public:${studentId}`,
    ];
    
    const patterns = [
      'student:assigned_questions:*',
      'student:topics:*',
      'student:topic_overview:*',
      'student:class_progress:*',
      'student:bookmarks:*',
      'student:recent_questions:*'
    ];
    
    // Delete specific keys
    await Promise.all(keys.map(key => redis.del(key)));
    
    // Delete pattern-based keys using SCAN
    await Promise.all(patterns.map(pattern => deleteByPattern(pattern)));
    
    // Also invalidate leaderboards (student rank changed)
    await this.invalidateAllLeaderboards();
  }
  
  // Leaderboard invalidation
  static async invalidateAllLeaderboards() {
    const patterns = [
      'leaderboard:student:*',
      'leaderboard:admin:*',
      'leaderboard:top10:*'
    ];
    
    await Promise.all(patterns.map(pattern => deleteByPattern(pattern)));
  }
  
  // Batch-level invalidation
  static async invalidateBatch(batchId: number) {
    const patterns = [
      'student:assigned_questions:*',
      'student:topics:*',
      'student:topic_overview:*',
      'student:class_progress:*',
      'student:recent_questions:*'
    ];
    
    await Promise.all(patterns.map(pattern => deleteByPattern(pattern)));
  }
  
  // Admin stats invalidation
  static async invalidateAdminStats() {
    await deleteByPattern('admin:stats:*');
  }
  
  // Topics invalidation
  static async invalidateAdminTopics() {
    const keys = [
      'admin:topics:all',
      'static:topics' // Also invalidate public topics cache
    ];
    
    await Promise.all(keys.map(key => redis.del(key)));
  }
  
  // Simple utility methods for common invalidations
  static async invalidateAssignedQuestions() {
    await deleteByPattern('student:assigned_questions:*');
  }

  // Batch-specific invalidation - more precise
  static async invalidateAssignedQuestionsForBatch(batchId: number) {
    await deleteByPattern(`student:assigned_questions:*:*:${batchId}:*`);
  }
  
  static async invalidateTopics() {
    await deleteByPattern('student:topics:*');
  }
  
  static async invalidateTopicOverviews() {
    await deleteByPattern('student:topic_overview:*');
  }
  
  static async invalidateClassProgress() {
    await deleteByPattern('student:class_progress:*');
  }
  
  static async invalidateRecentQuestions() {
    await deleteByPattern('student:recent_questions:*');
  }
}
