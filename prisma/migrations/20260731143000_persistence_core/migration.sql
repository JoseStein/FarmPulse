-- AlterEnum
ALTER TYPE "IssueStatus" ADD VALUE 'CLOSED';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "weatherSnapshotId" UUID;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "FieldNote" ADD COLUMN     "cropCycleId" UUID,
ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "assignedUserId" UUID,
ADD COLUMN     "fieldNoteId" UUID,
ADD COLUMN     "followUpTaskId" UUID,
ADD COLUMN     "resolutionNotes" TEXT,
ADD COLUMN     "resolvedById" UUID;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedById" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "Activity_idempotencyKey_key" ON "Activity"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_idempotencyKey_key" ON "Expense"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "FieldNote_idempotencyKey_key" ON "FieldNote"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_fieldNoteId_key" ON "Issue"("fieldNoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_followUpTaskId_key" ON "Issue"("followUpTaskId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_weatherSnapshotId_fkey" FOREIGN KEY ("weatherSnapshotId") REFERENCES "WeatherSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldNote" ADD CONSTRAINT "FieldNote_cropCycleId_fkey" FOREIGN KEY ("cropCycleId") REFERENCES "CropCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_fieldNoteId_fkey" FOREIGN KEY ("fieldNoteId") REFERENCES "FieldNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_followUpTaskId_fkey" FOREIGN KEY ("followUpTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
