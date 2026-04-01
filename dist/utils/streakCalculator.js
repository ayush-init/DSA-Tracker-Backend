"use strict";
/**
 * Streak Calculation Utility
 * Calculates current streak and max streak based on student progress dates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateStreak = calculateStreak;
exports.calculateStreakWithFreeze = calculateStreakWithFreeze;
exports.calculateStreakByActivity = calculateStreakByActivity;
/**
 * Calculate streak based on daily problem solving activity
 * A streak is maintained if student solves at least one problem per day
 */
function calculateStreak(syncDates) {
    if (syncDates.length === 0) {
        return { currentStreak: 0, maxStreak: 0 };
    }
    // Sort dates in descending order (newest first)
    const sortedDates = syncDates.sort((a, b) => b.getTime() - a.getTime());
    // Convert to date strings (YYYY-MM-DD) to compare days
    const dateStrings = sortedDates.map(date => date.toISOString().split('T')[0]);
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
        }
        else if (dateStr < expectedDateStr) {
            // Break the streak if there's a gap
            break;
        }
    }
    // Calculate max streak by going through all dates
    let previousDate = null;
    for (let i = 0; i < uniqueDates.length; i++) {
        const currentDate = new Date(uniqueDates[i]);
        if (previousDate === null) {
            // Start new streak
            tempStreak = 1;
        }
        else {
            const daysDiff = Math.floor((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff === 1) {
                // Consecutive day - continue streak
                tempStreak++;
            }
            else {
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
 * Calculate streak based on daily problem solving activity with freeze logic
 * A streak is maintained if:
 * 1. Student solves at least one problem per day when questions are available
 * 2. Questions are not uploaded on a day (freeze day - streak is preserved)
 */
function calculateStreakWithFreeze(syncDates, questionAvailability) {
    if (syncDates.length === 0) {
        return { currentStreak: 0, maxStreak: 0 };
    }
    // Sort dates in descending order (newest first)
    const sortedDates = syncDates.sort((a, b) => b.getTime() - a.getTime());
    // Convert to date strings (YYYY-MM-DD) to compare days
    const dateStrings = sortedDates.map(date => date.toISOString().split('T')[0]);
    // Remove duplicates (same day multiple submissions)
    const uniqueDates = [...new Set(dateStrings)];
    // Create a map for quick question availability lookup
    const questionMap = new Map(questionAvailability.map(q => [q.date, q.hasQuestion]));
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
        }
        else {
            // Check if there are any days without questions between expectedDate and dateStr
            let currentDate = new Date(expectedDate);
            currentDate.setDate(currentDate.getDate() - 1);
            let hasAllQuestions = true;
            while (currentDate.toISOString().split('T')[0] > dateStr) {
                const currentDateStr = currentDate.toISOString().split('T')[0];
                const hasQuestion = questionMap.get(currentDateStr) ?? true; // Assume questions available if not specified
                if (!hasQuestion) {
                    // Skip freeze days
                    currentDate.setDate(currentDate.getDate() - 1);
                    continue;
                }
                else {
                    // Found a day with questions but no activity - break streak
                    hasAllQuestions = false;
                    break;
                }
            }
            if (!hasAllQuestions) {
                break;
            }
            // If we get here, all intermediate days were freeze days, so continue streak
            currentStreak++;
            expectedDate.setDate(new Date(dateStr).getDate() - 1);
        }
    }
    // Calculate max streak by going through all dates
    let previousDate = null;
    for (let i = 0; i < uniqueDates.length; i++) {
        const currentDate = new Date(uniqueDates[i]);
        if (previousDate === null) {
            // Start new streak
            tempStreak = 1;
        }
        else {
            const daysDiff = Math.floor((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff === 1) {
                // Consecutive day - continue streak
                tempStreak++;
            }
            else if (daysDiff > 1) {
                // Check if all intermediate days were freeze days
                let hasAllQuestions = true;
                let checkDate = new Date(previousDate);
                checkDate.setDate(checkDate.getDate() - 1);
                while (checkDate > currentDate) {
                    const checkDateStr = checkDate.toISOString().split('T')[0];
                    const hasQuestion = questionMap.get(checkDateStr) ?? true;
                    if (!hasQuestion) {
                        // Freeze day - skip
                        checkDate.setDate(checkDate.getDate() - 1);
                        continue;
                    }
                    else {
                        // Day with questions but no activity - break streak
                        hasAllQuestions = false;
                        break;
                    }
                }
                if (hasAllQuestions) {
                    // All intermediate days were freeze days - continue streak
                    tempStreak++;
                }
                else {
                    // Break in streak - reset and start new streak
                    maxStreak = Math.max(maxStreak, tempStreak);
                    tempStreak = 1;
                }
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
function calculateStreakByActivity(activityDates) {
    if (activityDates.length === 0) {
        return { currentStreak: 0, maxStreak: 0 };
    }
    // Group activities by day
    const activitiesByDay = new Map();
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
        }
        else if (dayStr < expectedDateStr) {
            break;
        }
    }
    // Calculate max streak
    let previousDay = null;
    for (const dayStr of sortedDays) {
        if (previousDay === null) {
            tempStreak = 1;
        }
        else {
            const prevDate = new Date(previousDay);
            const currDate = new Date(dayStr);
            const daysDiff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff === 1) {
                tempStreak++;
            }
            else {
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
