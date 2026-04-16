import redis from '../config/redis';
import { deleteByPattern } from './redisUtils';

export class CacheInvalidation {
  
  // Student-specific invalidation
  static async invalidateStudent(studentId: number, batchId?: number) {
    // We use deleteByPattern for these because buildCacheKey adds a trailing colon 
    // or stringified params, so an exact key deletion without trailing colons will miss.
    const patterns = [
      `student:profile:${studentId}:*`,
      `student:profile:public:${studentId}:*`,
      `student:assigned_questions:${studentId}:*`,
      `student:topics:${studentId}:*`,
      `student:topic_overview:${studentId}:*`,
      `student:class_progress:${studentId}:*`,
      `student:bookmarks:${studentId}:*`,
      `student:recent_questions:${studentId}:*`
    ];
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
    await deleteByPattern(`student:assigned_questions:*:${batchId}:*`);
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
  
  // Batch-specific topics invalidation
  static async invalidateTopicsForBatch(batchId: number) {
    await deleteByPattern(`student:topics:*:${batchId}:*`);
  }
  
  // Student-specific topics invalidation
  static async invalidateTopicsForStudent(studentId: number) {
    await deleteByPattern(`student:topics:${studentId}:*`);
  }
  
  // Batch-specific topic overview invalidation
  static async invalidateTopicOverviewsForBatch(batchId: number) {
    await deleteByPattern(`student:topic_overview:*:${batchId}:*`);
  }
  
  // Student-specific topic overview invalidation
  static async invalidateTopicOverviewsForStudent(studentId: number) {
    await deleteByPattern(`student:topic_overview:${studentId}:*`);
  }
  
  // Student-specific assigned questions invalidation
  static async invalidateAssignedQuestionsForStudent(studentId: number) {
    await deleteByPattern(`student:assigned_questions:${studentId}:*`);
  }
  
  // Student-specific profile invalidation
  static async invalidateStudentProfile(studentId: number) {
    const patterns = [
      `student:profile:${studentId}:*`,
      `student:profile:public:${studentId}:*`
    ];
    
    await Promise.all(patterns.map(pattern => deleteByPattern(pattern)));
  }
  
  // Batch-specific class progress invalidation
  static async invalidateClassProgressForBatch(batchId: number) {
    await deleteByPattern(`student:class_progress:*:${batchId}:*`);
  }
  
  // Student-specific class progress invalidation
  static async invalidateClassProgressForStudent(studentId: number) {
    await deleteByPattern(`student:class_progress:${studentId}:*`);
  }
  

  
  // Student-specific bookmarks invalidation
  static async invalidateBookmarksForStudent(studentId: number) {
    await deleteByPattern(`student:bookmarks:${studentId}:*`);
  }
  
  // General bookmarks invalidation
  static async invalidateBookmarks() {
    await deleteByPattern('student:bookmarks:*');
  }
  
  // All student profiles invalidation
  static async invalidateAllStudentProfiles() {
    const patterns = [
      'student:profile:*',
      'student:profile:public:*'
    ];
    
    await Promise.all(patterns.map(pattern => deleteByPattern(pattern)));
  }
}
