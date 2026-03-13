/**
 * Streak Calculation Utility
 * Calculates current streak and max streak based on student progress dates
 */

export interface StreakResult {
  currentStreak: number;
  maxStreak: number;
}

/**
 * Calculate streak based on daily problem solving activity
 * A streak is maintained if student solves at least one problem per day
 */
export function calculateStreak(syncDates: Date[]): StreakResult {
  if (syncDates.length === 0) {
    return { currentStreak: 0, maxStreak: 0 };
  }

  // Sort dates in descending order (newest first)
  const sortedDates = syncDates.sort((a, b) => b.getTime() - a.getTime());
  
  // Convert to date strings (YYYY-MM-DD) to compare days
  const dateStrings = sortedDates.map(date => 
    date.toISOString().split('T')[0]
  );
  
  // Remove duplicates (same day multiple submissions)
  const uniqueDates = [...new Set(dateStrings)];
  
  // Calculate current streak
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;
  
  const today = new Date().toISOString().split('T')[0];
  let expectedDate = new Date(today);
  
  // Check current streak from today backwards
  for (const dateStr of uniqueDates) {
    const expectedDateStr = expectedDate.toISOString().split('T')[0];
    
    if (dateStr === expectedDateStr) {
      currentStreak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (dateStr < expectedDateStr) {
      // Break the streak if there's a gap
      break;
    }
  }
  
  // Calculate max streak by going through all dates
  let previousDate: Date | null = null;
  
  for (let i = 0; i < uniqueDates.length; i++) {
    const currentDate = new Date(uniqueDates[i]);
    
    if (previousDate === null) {
      // Start new streak
      tempStreak = 1;
    } else {
      const daysDiff = Math.floor((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        // Consecutive day - continue streak
        tempStreak++;
      } else {
        // Break in streak - reset and start new streak
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 1;
      }
    }
    
    previousDate = currentDate;
  }
  
  // Final check for max streak
  maxStreak = Math.max(maxStreak, tempStreak);
  
  return {
    currentStreak,
    maxStreak
  };
}

/**
 * Alternative streak calculation based on consecutive days with activity
 * More lenient - considers any activity within a day as maintaining streak
 */
export function calculateStreakByActivity(activityDates: Date[]): StreakResult {
  if (activityDates.length === 0) {
    return { currentStreak: 0, maxStreak: 0 };
  }

  // Group activities by day
  const activitiesByDay = new Map<string, number>();
  
  activityDates.forEach(date => {
    const dayKey = date.toISOString().split('T')[0];
    activitiesByDay.set(dayKey, (activitiesByDay.get(dayKey) || 0) + 1);
  });

  // Sort days
  const sortedDays = Array.from(activitiesByDay.keys()).sort().reverse();
  
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;
  
  const today = new Date().toISOString().split('T')[0];
  let expectedDate = new Date(today);
  
  // Calculate current streak
  for (const dayStr of sortedDays) {
    const expectedDateStr = expectedDate.toISOString().split('T')[0];
    
    if (dayStr === expectedDateStr) {
      currentStreak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (dayStr < expectedDateStr) {
      break;
    }
  }
  
  // Calculate max streak
  let previousDay: string | null = null;
  
  for (const dayStr of sortedDays) {
    if (previousDay === null) {
      tempStreak = 1;
    } else {
      const prevDate = new Date(previousDay);
      const currDate = new Date(dayStr);
      const daysDiff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        tempStreak++;
      } else {
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 1;
      }
    }
    
    previousDay = dayStr;
  }
  
  maxStreak = Math.max(maxStreak, tempStreak);
  
  return {
    currentStreak,
    maxStreak
  };
}
