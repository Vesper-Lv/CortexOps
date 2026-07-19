-- PR-C1: Confidence-routing minimal schema
-- Adds three nullable columns to Signal for decision-confidence routing,
-- plus an index on humanStatus for auto_confirmed query performance.

-- AlterTable
ALTER TABLE "Signal" ADD COLUMN "decisionConfidence" REAL;
ALTER TABLE "Signal" ADD COLUMN "confidenceFactors" TEXT;
ALTER TABLE "Signal" ADD COLUMN "sourceTier" TEXT;

-- CreateIndex
CREATE INDEX "Signal_humanStatus_idx" ON "Signal"("humanStatus");
