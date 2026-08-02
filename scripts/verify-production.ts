import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const farmId = process.argv.find((arg) => arg.startsWith("--farm="))?.slice(7);
async function main() {
  if (!farmId) throw new Error("Required: --farm=<farm-uuid>.");
  const farm = await prisma.farm.findUnique({ where: { id: farmId }, include: { memberships: true, fields: { where: { deletedAt: null }, include: { sectors: true, cycles: { where: { status: "ACTIVE" }, include: { growthStage: true } } } } } });
  if (!farm) throw new Error("Target farm was not found.");
  const fieldIds = farm.fields.map((f) => f.id), sectorIds = farm.fields.flatMap((f) => f.sectors.map((s) => s.id));
  const [mockTasks, mockActivities, mockExpenses, mockNotes, mockIssues, mockInventory, mockEquipment, irrigation, sampleGuidance] = await Promise.all([
    prisma.task.count({ where: { fieldId: { in: fieldIds }, name: { in: ["Irrigate Sector 2", "Inspect reported drip-line leak", "Scout seedling emergence"] } } }),
    prisma.activity.count({ where: { fieldId: { in: fieldIds }, notes: { startsWith: "Sample", mode: "insensitive" } } }),
    prisma.expense.count({ where: { fieldId: { in: fieldIds }, description: { in: ["Corn seed", "Field labor", "Nitrogen fertilizer"] } } }),
    prisma.fieldNote.count({ where: { fieldId: { in: fieldIds }, body: { startsWith: "Sample record:" } } }),
    prisma.issue.count({ where: { fieldId: { in: fieldIds }, description: { startsWith: "Sample issue:" } } }),
    prisma.inventoryItem.count({ where: { farmId, name: { in: ["Corn seed · Pioneer P4226", "Nitrogen fertilizer", "16 mm drip tape"] } } }),
    prisma.equipment.count({ where: { farmId, name: { in: ["River intake pump", "Irrigation pressure pump", "24,000 L storage tank", "Main irrigation filter"] }, notes: null } }),
    prisma.irrigationEvent.count({ where: { sectorId: { in: sectorIds } } }),
    prisma.cropGuideArticle.count({ where: { guide: { crop: { name: "Corn" } }, sourceName: "Sample content — validate locally" } }),
  ]);
  const cycles = farm.fields.flatMap((field) => field.cycles);
  const importedDesign = await prisma.appSetting.findUnique({ where: { farmId_key: { farmId, key: "land_design_may_2024" } } });
  const lotNames = new Set(farm.fields.map((field) => field.name));
  const unassignedCrop = await prisma.crop.findUnique({ where: { name: "Crop not selected" }, select: { id: true } });
  const checks: Record<string, boolean> = {
    administratorPresent: farm.memberships.some((m) => m.role === "ADMIN"),
    fourPlannedLotsPresent: ["Lot 1", "Lot 2", "Lot 3", "Lot 4"].every((name) => lotNames.has(name)),
    oneIrrigationZonePerLot: farm.fields.length === 4 && farm.fields.every((field) => field.sectors.length === 1),
    cropsRemainUnassigned: Boolean(unassignedCrop && cycles.length === 4 && cycles.every((cycle) => cycle.cropId === unassignedCrop.id)),
    allCyclesPlanning: cycles.length === 4 && cycles.every((cycle) => ["Planning", "Land preparation"].includes(cycle.growthStage?.name ?? "")),
    noPlantingDates: cycles.length === 4 && cycles.every((cycle) => !cycle.plannedPlantingDate && !cycle.actualPlantingDate),
    noYieldOrHarvest: cycles.length === 4 && cycles.every((cycle) => !cycle.expectedYieldKg && !cycle.actualYieldKg && !cycle.expectedHarvestDate && !cycle.actualHarvestDate),
    landDesignPersisted: Boolean(importedDesign),
    noKnownMockOperations: [mockTasks, mockActivities, mockExpenses, mockNotes, mockIssues, mockInventory, mockEquipment, irrigation, sampleGuidance].every((count) => count === 0),
  };
  console.log(JSON.stringify({ farm: { id: farm.id, name: farm.name }, checks }, null, 2));
  if (Object.values(checks).some((ok) => !ok)) throw new Error("Production verification failed.");
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
