-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
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
    "operationMode" TEXT NOT NULL DEFAULT 'proxy'
);

-- CreateTable
CREATE TABLE "ArrInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "preferredProvider" TEXT NOT NULL DEFAULT 'pcjones',
    "lastSyncAt" DATETIME,
    "lastSyncError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SearchItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "arrInstanceId" TEXT NOT NULL,
    "arrId" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "expectedTitle" TEXT NOT NULL,
    "expectedAuthor" TEXT,
    "germanTitle" TEXT,
    "mediaType" TEXT NOT NULL,
    "titleSearchVariations" TEXT NOT NULL,
    "titleMatchVariations" TEXT NOT NULL,
    "authorMatchVariations" TEXT NOT NULL,
    "aliases" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SearchItem_arrInstanceId_fkey" FOREIGN KEY ("arrInstanceId") REFERENCES "ArrInstance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TitleApiCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME
);

-- CreateTable
CREATE TABLE "TitleTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cacheId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "title" TEXT,
    "aliasesJson" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TitleTranslation_cacheId_fkey" FOREIGN KEY ("cacheId") REFERENCES "TitleApiCache" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequestHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiKey" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "query" TEXT,
    "externalId" TEXT,
    "status" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "cacheHit" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RenameHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalTitle" TEXT NOT NULL,
    "rewrittenTitle" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "matchedSearchItemId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "arrInstanceId" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "itemsCount" INTEGER NOT NULL DEFAULT 0,
    "pcjonesItemsCount" INTEGER NOT NULL DEFAULT 0,
    "tmdbItemsCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    CONSTRAINT "SyncRun_arrInstanceId_fkey" FOREIGN KEY ("arrInstanceId") REFERENCES "ArrInstance" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Plugin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "ArrInstance_enabled_idx" ON "ArrInstance"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ArrInstance_type_name_key" ON "ArrInstance"("type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SearchItem_arrInstanceId_externalId_key" ON "SearchItem"("arrInstanceId", "externalId");

-- CreateIndex
CREATE INDEX "TitleApiCache_expiresAt_idx" ON "TitleApiCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TitleTranslation_cacheId_lang_key" ON "TitleTranslation"("cacheId", "lang");

-- CreateIndex
CREATE INDEX "RequestHistory_createdAt_idx" ON "RequestHistory"("createdAt");

-- CreateIndex
CREATE INDEX "RequestHistory_createdAt_cacheHit_idx" ON "RequestHistory"("createdAt", "cacheHit");

-- CreateIndex
CREATE INDEX "RequestHistory_type_idx" ON "RequestHistory"("type");

-- CreateIndex
CREATE INDEX "RequestHistory_domain_idx" ON "RequestHistory"("domain");

-- CreateIndex
CREATE INDEX "RenameHistory_createdAt_idx" ON "RenameHistory"("createdAt");

-- CreateIndex
CREATE INDEX "RenameHistory_mediaType_idx" ON "RenameHistory"("mediaType");

-- CreateIndex
CREATE INDEX "SyncRun_startedAt_idx" ON "SyncRun"("startedAt");

-- CreateIndex
CREATE INDEX "SyncRun_status_idx" ON "SyncRun"("status");

-- CreateIndex
CREATE INDEX "SyncRun_arrInstanceId_startedAt_idx" ON "SyncRun"("arrInstanceId", "startedAt");

-- CreateIndex
CREATE INDEX "LogEntry_createdAt_idx" ON "LogEntry"("createdAt");

-- CreateIndex
CREATE INDEX "LogEntry_level_idx" ON "LogEntry"("level");
