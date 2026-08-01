-- A crop cycle can exist during planning before a planting date is known.
ALTER TABLE "CropCycle" ALTER COLUMN "plannedPlantingDate" DROP NOT NULL;
