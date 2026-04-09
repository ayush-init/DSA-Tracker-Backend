// This file has been refactored into smaller modules.
// Please import directly from the specific service modules:
// - ./heatmap/heatmap-utils.service (getBatchStartMonth, getBatchQuestionStats, hasQuestionAssignment, calculateHeatmapCount, getTodayQuestionAvailability)
// - ./heatmap/heatmap-generation.service (generateUnifiedHeatmap)

export interface HeatmapOptions {
  includePrivateData?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface HeatmapData {
  date: string;
  count: number;
}

export interface BatchQuestionStats {
  totalAssigned: number;
  totalSolved: number;
  completedAllQuestions: boolean;
}
