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
    prisma.equipment.count({ where: { farmId, name: { in: ["River intake pump", "Irrigation pressure pump", "24,000 L storage tank", "Main irrigation filter"] } } }),
    prisma.irrigationEvent.count({ where: { sectorId: { in: sectorIds } } }),
    prisma.cropGuideArticle.count({ where: { guide: { crop: { name: "Corn" } }, sourceName: "Sample content — validate locally" } }),
  ]);
  const cycle = farm.fields[0]?.cycles[0];
  const checks: Record<string, boolean> = { administratorPresent: farm.memberships.some((m) => m.role === "ADMIN"), fieldPresent: farm.fields.length > 0, fourSectorsPresent: sectorIds.length === 4, activePlanningCycle: Boolean(cycle && ["Planning", "Land preparation"].includes(cycle.growthStage?.name ?? "")), noPlantingDates: Boolean(cycle && !cycle.plannedPlantingDate && !cycle.actualPlantingDate), noYieldOrHarvest: Boolean(cycle && !cycle.expectedYieldKg && !cycle.actualYieldKg && !cycle.expectedHarvestDate && !cycle.actualHarvestDate), noKnownMockOperations: [mockTasks, mockActivities, mockExpenses, mockNotes, mockIssues, mockInventory, mockEquipment, irrigation, sampleGuidance].every((count) => count === 0) };
  console.log(JSON.stringify({ farm: { id: farm.id, name: farm.name }, checks }, null, 2));
  if (Object.values(checks).some((ok) => !ok)) throw new Error("Production verification failed.");
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
