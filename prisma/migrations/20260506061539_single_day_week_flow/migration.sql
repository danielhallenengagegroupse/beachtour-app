-- CreateTable
CREATE TABLE "week_participants" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "week_participants_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "weeks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "week_participants_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_games" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dayId" INTEGER NOT NULL,
    "roundNumber" INTEGER NOT NULL DEFAULT 1,
    "gameNumber" INTEGER NOT NULL,
    "team1Score" INTEGER,
    "team2Score" INTEGER,
    "winnerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "games_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "days" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "games_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "players" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_games" ("createdAt", "dayId", "gameNumber", "id", "team1Score", "team2Score", "updatedAt", "winnerId") SELECT "createdAt", "dayId", "gameNumber", "id", "team1Score", "team2Score", "updatedAt", "winnerId" FROM "games";
DROP TABLE "games";
ALTER TABLE "new_games" RENAME TO "games";
CREATE UNIQUE INDEX "games_dayId_gameNumber_key" ON "games"("dayId", "gameNumber");
CREATE TABLE "new_season_standings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerId" INTEGER NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "season_standings_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_season_standings" ("createdAt", "gamesPlayed", "id", "losses", "playerId", "totalPoints", "updatedAt", "wins") SELECT "createdAt", "gamesPlayed", "id", "losses", "playerId", "totalPoints", "updatedAt", "wins" FROM "season_standings";
DROP TABLE "season_standings";
ALTER TABLE "new_season_standings" RENAME TO "season_standings";
CREATE UNIQUE INDEX "season_standings_playerId_key" ON "season_standings"("playerId");
CREATE TABLE "new_weeks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekNumber" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "rounds" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_weeks" ("createdAt", "endDate", "id", "startDate", "updatedAt", "weekNumber") SELECT "createdAt", "endDate", "id", "startDate", "updatedAt", "weekNumber" FROM "weeks";
DROP TABLE "weeks";
ALTER TABLE "new_weeks" RENAME TO "weeks";
CREATE UNIQUE INDEX "weeks_weekNumber_key" ON "weeks"("weekNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "week_participants_weekId_playerId_key" ON "week_participants"("weekId", "playerId");
