/*
  Warnings:

  - You are about to alter the column `lossesCount` on the `daily_rankings` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `winsCount` on the `daily_rankings` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `losses` on the `player_standings` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `wins` on the `player_standings` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `losses` on the `season_standings` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `wins` on the `season_standings` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.

*/
-- CreateTable
CREATE TABLE "ranking_point_rules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "position" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_daily_rankings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dayId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "winsCount" REAL NOT NULL,
    "lossesCount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "daily_rankings_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "days" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "daily_rankings_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_daily_rankings" ("createdAt", "dayId", "id", "lossesCount", "playerId", "points", "rank", "updatedAt", "winsCount") SELECT "createdAt", "dayId", "id", "lossesCount", "playerId", "points", "rank", "updatedAt", "winsCount" FROM "daily_rankings";
DROP TABLE "daily_rankings";
ALTER TABLE "new_daily_rankings" RENAME TO "daily_rankings";
CREATE UNIQUE INDEX "daily_rankings_dayId_playerId_key" ON "daily_rankings"("dayId", "playerId");
CREATE TABLE "new_player_standings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" REAL NOT NULL DEFAULT 0,
    "losses" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "player_standings_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "weeks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "player_standings_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_player_standings" ("createdAt", "gamesPlayed", "id", "losses", "playerId", "totalPoints", "updatedAt", "weekId", "wins") SELECT "createdAt", "gamesPlayed", "id", "losses", "playerId", "totalPoints", "updatedAt", "weekId", "wins" FROM "player_standings";
DROP TABLE "player_standings";
ALTER TABLE "new_player_standings" RENAME TO "player_standings";
CREATE UNIQUE INDEX "player_standings_weekId_playerId_key" ON "player_standings"("weekId", "playerId");
CREATE TABLE "new_season_standings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerId" INTEGER NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" REAL NOT NULL DEFAULT 0,
    "losses" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "season_standings_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_season_standings" ("createdAt", "gamesPlayed", "id", "losses", "playerId", "totalPoints", "updatedAt", "wins") SELECT "createdAt", "gamesPlayed", "id", "losses", "playerId", "totalPoints", "updatedAt", "wins" FROM "season_standings";
DROP TABLE "season_standings";
ALTER TABLE "new_season_standings" RENAME TO "season_standings";
CREATE UNIQUE INDEX "season_standings_playerId_key" ON "season_standings"("playerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ranking_point_rules_position_key" ON "ranking_point_rules"("position");
