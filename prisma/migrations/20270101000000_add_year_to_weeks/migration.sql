-- Add year column to weeks table (default 2026 for all existing rows)
ALTER TABLE "weeks" ADD COLUMN "year" INTEGER NOT NULL DEFAULT 2026;

-- Drop old unique constraint on weekNumber
DROP INDEX "weeks_weekNumber_key";

-- Create new unique constraint on (year, weekNumber)
CREATE UNIQUE INDEX "weeks_year_weekNumber_key" ON "weeks"("year", "weekNumber");

-- Add year column to season_standings table (default 2026 for all existing rows)
ALTER TABLE "season_standings" ADD COLUMN "year" INTEGER NOT NULL DEFAULT 2026;

-- Drop old unique constraint on playerId
DROP INDEX "season_standings_playerId_key";

-- Create new unique constraint on (playerId, year)
CREATE UNIQUE INDEX "season_standings_playerId_year_key" ON "season_standings"("playerId", "year");
