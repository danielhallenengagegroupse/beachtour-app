-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_weeks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekNumber" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "rounds" INTEGER NOT NULL DEFAULT 1,
    "rainyDay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_weeks" ("createdAt", "endDate", "id", "rounds", "startDate", "updatedAt", "weekNumber") SELECT "createdAt", "endDate", "id", "rounds", "startDate", "updatedAt", "weekNumber" FROM "weeks";
DROP TABLE "weeks";
ALTER TABLE "new_weeks" RENAME TO "weeks";
CREATE UNIQUE INDEX "weeks_weekNumber_key" ON "weeks"("weekNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
