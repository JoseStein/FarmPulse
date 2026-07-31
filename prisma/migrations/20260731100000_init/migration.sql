-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PLANNED', 'DUE_TODAY', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('PLANTING', 'IRRIGATION', 'FERTILIZER_APPLICATION', 'PESTICIDE_APPLICATION', 'HERBICIDE_APPLICATION', 'PEST_INSPECTION', 'DISEASE_INSPECTION', 'WEED_CONTROL', 'SOIL_WORK', 'EQUIPMENT_MAINTENANCE', 'RAINFALL_OBSERVATION', 'FIELD_OBSERVATION', 'HARVEST', 'OTHER');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('IRRIGATE_TODAY', 'MONITOR', 'DELAY', 'SKIP_RAIN', 'NONE');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Farm" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "unitSystem" TEXT NOT NULL DEFAULT 'METRIC',
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmMembership" (
    "id" UUID NOT NULL,
    "farmId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "FarmMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Field" (
    "id" UUID NOT NULL,
    "farmId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "areaHa" DECIMAL(10,3) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" UUID NOT NULL,
    "fieldId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "dripLines" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Healthy',

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Crop" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "scientificName" TEXT,

    CONSTRAINT "Crop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthStage" (
    "id" UUID NOT NULL,
    "cropId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "GrowthStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropCycle" (
    "id" UUID NOT NULL,
    "fieldId" UUID NOT NULL,
    "cropId" UUID NOT NULL,
    "growthStageId" UUID,
    "variety" TEXT,
    "plannedPlantingDate" TIMESTAMP(3) NOT NULL,
    "actualPlantingDate" TIMESTAMP(3),
    "expectedHarvestDate" TIMESTAMP(3),
    "actualHarvestDate" TIMESTAMP(3),
    "seedQuantityKg" DECIMAL(10,2),
    "populationTarget" INTEGER,
    "expectedYieldKg" DECIMAL(12,2),
    "actualYieldKg" DECIMAL(12,2),
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CropCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropCycleSector" (
    "cropCycleId" UUID NOT NULL,
    "sectorId" UUID NOT NULL,

    CONSTRAINT "CropCycleSector_pkey" PRIMARY KEY ("cropCycleId","sectorId")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "fieldId" UUID NOT NULL,
    "sectorId" UUID,
    "cropCycleId" UUID,
    "assignedUserId" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "recurrence" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PLANNED',
    "completionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" UUID NOT NULL,
    "fieldId" UUID NOT NULL,
    "sectorId" UUID,
    "cropCycleId" UUID,
    "createdById" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "quantity" DECIMAL(12,3),
    "unit" TEXT,
    "productUsed" TEXT,
    "worker" TEXT,
    "cost" DECIMAL(12,2),
    "notes" TEXT,
    "completedTaskId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IrrigationEvent" (
    "id" UUID NOT NULL,
    "sectorId" UUID NOT NULL,
    "activityId" UUID,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "flowM3h" DECIMAL(8,2) NOT NULL,
    "estimatedLiters" DECIMAL(12,2) NOT NULL,
    "pressureBar" DECIMAL(5,2),
    "pumpRuntimeMinutes" INTEGER,
    "operator" TEXT NOT NULL,
    "notes" TEXT,
    "problems" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IrrigationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherSnapshot" (
    "id" UUID NOT NULL,
    "farmId" UUID NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "temperatureC" DECIMAL(5,2),
    "humidityPct" INTEGER,
    "windKph" DECIMAL(6,2),
    "precipitationMm" DECIMAL(7,2),
    "rainProbability" INTEGER,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherAlert" (
    "id" UUID NOT NULL,
    "farmId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "Priority" NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" UUID NOT NULL,
    "sectorId" UUID,
    "type" "RecommendationType" NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" UUID NOT NULL,
    "fieldId" UUID NOT NULL,
    "sectorId" UUID,
    "cropCycleId" UUID,
    "enteredById" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "vendor" TEXT,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "quantity" DECIMAL(12,3),
    "unitCost" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" UUID NOT NULL,
    "farmId" UUID NOT NULL,
    "cropCycleId" UUID,
    "name" TEXT NOT NULL,
    "plannedAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" UUID NOT NULL,
    "farmId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantityOnHand" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "minimumThreshold" DECIMAL(12,3) NOT NULL,
    "unitCost" DECIMAL(12,2),
    "supplier" TEXT,
    "storageLocation" TEXT,
    "expirationDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "activityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" UUID NOT NULL,
    "farmId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "runtimeHours" DECIMAL(10,1),
    "lastMaintenance" TIMESTAMP(3),
    "nextMaintenance" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" UUID NOT NULL,
    "equipmentId" UUID NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DECIMAL(12,2),
    "runtimeHours" DECIMAL(10,1),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldNote" (
    "id" UUID NOT NULL,
    "fieldId" UUID NOT NULL,
    "sectorId" UUID,
    "createdById" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isIssue" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FieldNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "activityId" UUID,
    "expenseId" UUID,
    "fieldNoteId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" UUID NOT NULL,
    "fieldId" UUID NOT NULL,
    "sectorId" UUID,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "Priority" NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropGuide" (
    "id" UUID NOT NULL,
    "cropId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CropGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropGuideArticle" (
    "id" UUID NOT NULL,
    "guideId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "stage" TEXT,
    "category" TEXT NOT NULL,
    "severity" "Priority",
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "lastReviewedAt" TIMESTAMP(3),
    "regionApplicability" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CropGuideArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "farmId" UUID,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" UUID NOT NULL,
    "farmId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "FarmMembership_userId_idx" ON "FarmMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FarmMembership_farmId_userId_key" ON "FarmMembership"("farmId", "userId");

-- CreateIndex
CREATE INDEX "Field_farmId_status_idx" ON "Field"("farmId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_fieldId_name_key" ON "Sector"("fieldId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Crop_name_key" ON "Crop"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthStage_cropId_name_key" ON "GrowthStage"("cropId", "name");

-- CreateIndex
CREATE INDEX "CropCycle_fieldId_status_idx" ON "CropCycle"("fieldId", "status");

-- CreateIndex
CREATE INDEX "Task_fieldId_status_dueAt_idx" ON "Task"("fieldId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_completedTaskId_key" ON "Activity"("completedTaskId");

-- CreateIndex
CREATE INDEX "Activity_fieldId_occurredAt_idx" ON "Activity"("fieldId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "IrrigationEvent_activityId_key" ON "IrrigationEvent"("activityId");

-- CreateIndex
CREATE INDEX "IrrigationEvent_sectorId_startedAt_idx" ON "IrrigationEvent"("sectorId", "startedAt");

-- CreateIndex
CREATE INDEX "WeatherSnapshot_farmId_observedAt_idx" ON "WeatherSnapshot"("farmId", "observedAt");

-- CreateIndex
CREATE INDEX "Expense_fieldId_date_category_idx" ON "Expense"("fieldId", "date", "category");

-- CreateIndex
CREATE INDEX "InventoryItem_farmId_category_idx" ON "InventoryItem"("farmId", "category");

-- CreateIndex
CREATE INDEX "InventoryTransaction_itemId_createdAt_idx" ON "InventoryTransaction"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "Issue_fieldId_status_idx" ON "Issue"("fieldId", "status");

-- CreateIndex
CREATE INDEX "CropGuideArticle_guideId_category_idx" ON "CropGuideArticle"("guideId", "category");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "AuditLog_farmId_createdAt_idx" ON "AuditLog"("farmId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_farmId_key_key" ON "AppSetting"("farmId", "key");

-- AddForeignKey
ALTER TABLE "FarmMembership" ADD CONSTRAINT "FarmMembership_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmMembership" ADD CONSTRAINT "FarmMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Field" ADD CONSTRAINT "Field_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sector" ADD CONSTRAINT "Sector_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthStage" ADD CONSTRAINT "GrowthStage_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropCycle" ADD CONSTRAINT "CropCycle_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropCycle" ADD CONSTRAINT "CropCycle_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropCycle" ADD CONSTRAINT "CropCycle_growthStageId_fkey" FOREIGN KEY ("growthStageId") REFERENCES "GrowthStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropCycleSector" ADD CONSTRAINT "CropCycleSector_cropCycleId_fkey" FOREIGN KEY ("cropCycleId") REFERENCES "CropCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropCycleSector" ADD CONSTRAINT "CropCycleSector_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_cropCycleId_fkey" FOREIGN KEY ("cropCycleId") REFERENCES "CropCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_cropCycleId_fkey" FOREIGN KEY ("cropCycleId") REFERENCES "CropCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_completedTaskId_fkey" FOREIGN KEY ("completedTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IrrigationEvent" ADD CONSTRAINT "IrrigationEvent_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IrrigationEvent" ADD CONSTRAINT "IrrigationEvent_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_cropCycleId_fkey" FOREIGN KEY ("cropCycleId") REFERENCES "CropCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_cropCycleId_fkey" FOREIGN KEY ("cropCycleId") REFERENCES "CropCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldNote" ADD CONSTRAINT "FieldNote_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldNote" ADD CONSTRAINT "FieldNote_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldNote" ADD CONSTRAINT "FieldNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_fieldNoteId_fkey" FOREIGN KEY ("fieldNoteId") REFERENCES "FieldNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropGuide" ADD CONSTRAINT "CropGuide_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropGuideArticle" ADD CONSTRAINT "CropGuideArticle_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "CropGuide"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
