-- CreateTable
CREATE TABLE "BehaviorEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "signalId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "reason" TEXT,
    "contentTags" TEXT NOT NULL,
    "sourceType" TEXT,
    "predictedConfidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BehaviorEvent_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PreferenceWeight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentTags" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT '',
    "weight" REAL NOT NULL DEFAULT 0.5,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "BehaviorEvent_signalId_idx" ON "BehaviorEvent"("signalId");

-- CreateIndex
CREATE INDEX "BehaviorEvent_eventType_idx" ON "BehaviorEvent"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "PreferenceWeight_contentTags_sourceType_key" ON "PreferenceWeight"("contentTags", "sourceType");
