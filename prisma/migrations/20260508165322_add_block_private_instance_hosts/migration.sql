-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "appApiKey" TEXT NOT NULL,
    "proxyPort" INTEGER NOT NULL DEFAULT 5006,
    "proxyUsername" TEXT NOT NULL DEFAULT 'UmlautAdaptarr',
    "proxyPassword" TEXT NOT NULL DEFAULT '',
    "cacheDurationMinutes" INTEGER NOT NULL DEFAULT 12,
    "titleApiHost" TEXT NOT NULL DEFAULT 'https://umlautadaptarr.pcjones.de/api/v1',
    "tmdbApiKey" TEXT,
    "userAgent" TEXT NOT NULL DEFAULT 'UmlautAdaptarrEX/2.0',
    "setupComplete" BOOLEAN NOT NULL DEFAULT false,
    "prowlarrHost" TEXT,
    "prowlarrApiKey" TEXT,
    "logRetentionDays" INTEGER NOT NULL DEFAULT 3,
    "indexerRateLimitMs" INTEGER NOT NULL DEFAULT 500,
    "csrfSecret" TEXT,
    "operationMode" TEXT NOT NULL DEFAULT 'proxy',
    "blockPrivateInstanceHosts" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Setting" ("appApiKey", "cacheDurationMinutes", "csrfSecret", "id", "indexerRateLimitMs", "logRetentionDays", "operationMode", "prowlarrApiKey", "prowlarrHost", "proxyPassword", "proxyPort", "proxyUsername", "setupComplete", "titleApiHost", "tmdbApiKey", "userAgent") SELECT "appApiKey", "cacheDurationMinutes", "csrfSecret", "id", "indexerRateLimitMs", "logRetentionDays", "operationMode", "prowlarrApiKey", "prowlarrHost", "proxyPassword", "proxyPort", "proxyUsername", "setupComplete", "titleApiHost", "tmdbApiKey", "userAgent" FROM "Setting";
DROP TABLE "Setting";
ALTER TABLE "new_Setting" RENAME TO "Setting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
