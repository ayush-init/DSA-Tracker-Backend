-- Add missing streak columns to Leaderboard table
ALTER TABLE "Leaderboard" 
ADD COLUMN IF NOT EXISTS "current_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "max_streak" INTEGER NOT NULL DEFAULT 0;

-- Create index for max_streak if it doesn't exist
CREATE INDEX IF NOT EXISTS "Leaderboard_max_streak_idx" ON "Leaderboard"("max_streak");