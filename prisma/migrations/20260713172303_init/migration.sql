-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payload" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'running',
    "filesScanned" INTEGER NOT NULL DEFAULT 0,
    "linesTotal" INTEGER NOT NULL DEFAULT 0,
    "importedSignals" INTEGER NOT NULL DEFAULT 0,
    "importedCandidates" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordKey" TEXT NOT NULL,
    "stream" TEXT NOT NULL,
    "externalId" TEXT,
    "canonicalKey" TEXT,
    "date" TEXT,
    "title" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "originalUrl" TEXT,
    "priority" TEXT,
    "suggestedPool" TEXT,
    "finalPool" TEXT,
    "humanStatus" TEXT,
    "status" TEXT,
    "readingPackStatus" TEXT,
    "duplicateStatus" TEXT,
    "practiceFit" TEXT,
    "category" TEXT,
    "publishedAt" TEXT,
    "reason" TEXT,
    "aihotSummary" TEXT,
    "codexSummary" TEXT,
    "rawJson" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "sourceLine" INTEGER NOT NULL,
    "importRunId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Signal_importRunId_fkey" FOREIGN KEY ("importRunId") REFERENCES "ImportRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordKey" TEXT NOT NULL,
    "poolName" TEXT NOT NULL,
    "externalId" TEXT,
    "canonicalKey" TEXT,
    "date" TEXT,
    "title" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "originalUrl" TEXT,
    "priority" TEXT,
    "suggestedPool" TEXT,
    "finalPool" TEXT,
    "humanStatus" TEXT,
    "status" TEXT,
    "readingPackStatus" TEXT,
    "duplicateStatus" TEXT,
    "practiceFit" TEXT,
    "category" TEXT,
    "publishedAt" TEXT,
    "reason" TEXT,
    "aihotSummary" TEXT,
    "codexSummary" TEXT,
    "rawJson" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "sourceLine" INTEGER NOT NULL,
    "importRunId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Candidate_importRunId_fkey" FOREIGN KEY ("importRunId") REFERENCES "ImportRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "rationale" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Memo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "sourceContext" TEXT,
    "linkedSignalId" TEXT,
    "linkedUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'manual',
    "linkedSignalId" TEXT,
    "linkedCandidateId" TEXT,
    "linkedReportId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'inbox',
    "priority" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "origin" TEXT NOT NULL DEFAULT 'signal',
    "linkedSignalId" TEXT,
    "linkedCandidateId" TEXT,
    "linkedReportId" TEXT,
    "proofArtifact" TEXT,
    "interviewStoryAngle" TEXT,
    "portfolioPotential" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ArchiveReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "periodStart" TEXT,
    "periodEnd" TEXT,
    "rawMarkdown" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "importRunId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FocusRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "focusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priorityBoost" TEXT NOT NULL,
    "sourceTypesJson" TEXT NOT NULL,
    "contentTagsJson" TEXT NOT NULL,
    "candidatePoolBoostJson" TEXT NOT NULL,
    "appliesToJson" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "reviewCadence" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "fivePartJson" TEXT NOT NULL,
    "practicesJson" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "importRunId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DailySession" (
    "date" TEXT NOT NULL PRIMARY KEY,
    "selectedPracticeIndex" INTEGER,
    "practiceAlt0Disposition" TEXT,
    "practiceAlt1Disposition" TEXT,
    "practiceAlt2Disposition" TEXT,
    "candidatesDismissed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Signal_recordKey_key" ON "Signal"("recordKey");

-- CreateIndex
CREATE INDEX "Signal_stream_idx" ON "Signal"("stream");

-- CreateIndex
CREATE INDEX "Signal_canonicalKey_idx" ON "Signal"("canonicalKey");

-- CreateIndex
CREATE INDEX "Signal_status_idx" ON "Signal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_recordKey_key" ON "Candidate"("recordKey");

-- CreateIndex
CREATE INDEX "Candidate_poolName_idx" ON "Candidate"("poolName");

-- CreateIndex
CREATE INDEX "Candidate_canonicalKey_idx" ON "Candidate"("canonicalKey");

-- CreateIndex
CREATE INDEX "Candidate_humanStatus_idx" ON "Candidate"("humanStatus");

-- CreateIndex
CREATE INDEX "Candidate_status_idx" ON "Candidate"("status");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Memo_status_idx" ON "Memo"("status");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Artifact_status_idx" ON "Artifact"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ArchiveReport_sourceFile_key" ON "ArchiveReport"("sourceFile");

-- CreateIndex
CREATE INDEX "ArchiveReport_reportType_idx" ON "ArchiveReport"("reportType");

-- CreateIndex
CREATE INDEX "ArchiveReport_periodStart_idx" ON "ArchiveReport"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "FocusRule_focusId_key" ON "FocusRule"("focusId");

-- CreateIndex
CREATE INDEX "FocusRule_status_idx" ON "FocusRule"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_date_key" ON "DailyReport"("date");
