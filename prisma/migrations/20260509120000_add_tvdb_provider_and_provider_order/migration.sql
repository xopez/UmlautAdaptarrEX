-- AlterTable: Setting bekommt zwei optionale TVDB-Felder.
ALTER TABLE "Setting" ADD COLUMN "tvdbApiKey" TEXT;
ALTER TABLE "Setting" ADD COLUMN "tvdbPin" TEXT;

-- RedefineTables: ArrInstance verliert preferredProvider, bekommt providerOrder
-- (CSV). Backfill aus altem preferredProvider:
--   sonarr+pcjones → "pcjones,tvdb,tmdb"
--   sonarr+tmdb    → "tmdb,pcjones,tvdb"
--   radarr+*       → "tmdb,tvdb"  (pcjones ist filme-blind, gehört nicht in
--                                  den Radarr-Default; User kann es aber
--                                  manuell hinzufügen)
--   lidarr/readarr → NULL (TitleProvider wird dort nicht verwendet)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ArrInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "providerOrder" TEXT,
    "lastSyncAt" DATETIME,
    "lastSyncError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ArrInstance" ("apiKey", "createdAt", "enabled", "host", "id", "lastSyncAt", "lastSyncError", "name", "providerOrder", "type", "updatedAt")
SELECT
    "apiKey",
    "createdAt",
    "enabled",
    "host",
    "id",
    "lastSyncAt",
    "lastSyncError",
    "name",
    CASE
        WHEN "type" = 'sonarr' AND "preferredProvider" = 'tmdb' THEN 'tmdb,pcjones,tvdb'
        WHEN "type" = 'sonarr'                                  THEN 'pcjones,tvdb,tmdb'
        WHEN "type" = 'radarr'                                  THEN 'tmdb,tvdb'
        ELSE NULL
    END AS "providerOrder",
    "type",
    "updatedAt"
FROM "ArrInstance";
DROP TABLE "ArrInstance";
ALTER TABLE "new_ArrInstance" RENAME TO "ArrInstance";
CREATE INDEX "ArrInstance_enabled_idx" ON "ArrInstance"("enabled");
CREATE UNIQUE INDEX "ArrInstance_type_name_key" ON "ArrInstance"("type", "name");

-- RedefineTable: SyncRun bekommt tvdbItemsCount.
CREATE TABLE "new_SyncRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "arrInstanceId" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "itemsCount" INTEGER NOT NULL DEFAULT 0,
    "pcjonesItemsCount" INTEGER NOT NULL DEFAULT 0,
    "tmdbItemsCount" INTEGER NOT NULL DEFAULT 0,
    "tvdbItemsCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    CONSTRAINT "SyncRun_arrInstanceId_fkey" FOREIGN KEY ("arrInstanceId") REFERENCES "ArrInstance" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SyncRun" ("arrInstanceId", "errorMessage", "finishedAt", "id", "itemsCount", "pcjonesItemsCount", "startedAt", "status", "tmdbItemsCount") SELECT "arrInstanceId", "errorMessage", "finishedAt", "id", "itemsCount", "pcjonesItemsCount", "startedAt", "status", "tmdbItemsCount" FROM "SyncRun";
DROP TABLE "SyncRun";
ALTER TABLE "new_SyncRun" RENAME TO "SyncRun";
CREATE INDEX "SyncRun_startedAt_idx" ON "SyncRun"("startedAt");
CREATE INDEX "SyncRun_status_idx" ON "SyncRun"("status");
CREATE INDEX "SyncRun_arrInstanceId_startedAt_idx" ON "SyncRun"("arrInstanceId", "startedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
