import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const args = new Map(process.argv.slice(2).map((arg) => { const [key, ...rest] = arg.replace(/^--/, "").split("="); return [key, rest.join("=") || "true"]; }));
const farmId = args.get("farm");
const execute = args.get("execute") === "true";
const MOCK_TASKS = ["Irrigate Sector 2", "Inspect reported drip-line leak", "Scout seedling emergence"];
const MOCK_INVENTORY = ["Corn seed · Pioneer P4226", "Nitrogen fertilizer", "16 mm drip tape"];
const MOCK_EQUIPMENT = ["River intake pump", "Irrigation pressure pump", "24,000 L storage tank", "Main irrigation filter"];

async function main() {
  if (!farmId) throw new Error("Required: --farm=<farm-uuid>. No data was changed.");
  const farm = await prisma.farm.findUnique({ where: { id: farmId }, include: { fields: { where: { deletedAt: null }, select: { id: true } } } });
  if (!farm) throw new Error(`Farm ${farmId} was not found.`);
  const fieldIds = farm.fields.map((field) => field.id);
  const sectors = await prisma.sector.findMany({ where: { fieldId: { in: fieldIds } }, select: { id: true } });
  const sectorIds = sectors.map((sector) => sector.id);
  const cycles = await prisma.cropCycle.findMany({ where: { fieldId: { in: fieldIds } }, select: { id: true } });
  const cycleIds = cycles.map((cycle) => cycle.id);
  const irrigationEvents = await prisma.irrigationEvent.findMany({ where: { sectorId: { in: sectorIds } }, select: { id: true, activityId: true } });
  const sampleGuideArticles = await prisma.cropGuideArticle.findMany({ where: { guide: { crop: { name: "Corn" } }, sourceName: "Sample content — validate locally" }, select: { id: true, guideId: true } });

  const [tasks, activities, expenses, notes, issues, budgets, inventory, equipment, recommendations, alerts, notifications, weather] = await Promise.all([
    prisma.task.findMany({ where: { fieldId: { in: fieldIds } }, select: { id: true, name: true } }),
    prisma.activity.findMany({ where: { fieldId: { in: fieldIds } }, select: { id: true, notes: true, _count: { select: { attachments: true } } } }),
    prisma.expense.findMany({ where: { fieldId: { in: fieldIds }, deletedAt: null }, select: { id: true, description: true, _count: { select: { attachments: true } } } }),
    prisma.fieldNote.findMany({ where: { fieldId: { in: fieldIds }, deletedAt: null }, select: { id: true, body: true, _count: { select: { attachments: true } } } }),
    prisma.issue.findMany({ where: { fieldId: { in: fieldIds } }, select: { id: true, description: true } }),
    prisma.budget.findMany({ where: { farmId }, select: { id: true, name: true } }),
    prisma.inventoryItem.findMany({ where: { farmId, deletedAt: null }, select: { id: true, name: true } }),
    prisma.equipment.findMany({ where: { farmId }, select: { id: true, name: true } }),
    prisma.recommendation.findMany({ where: { sectorId: { in: sectorIds } }, select: { id: true } }),
    prisma.weatherAlert.findMany({ where: { farmId }, select: { id: true } }),
    prisma.notification.findMany({ where: { userId: { in: (await prisma.farmMembership.findMany({ where: { farmId }, select: { userId: true } })).map((m) => m.userId) } }, select: { id: true } }),
    prisma.weatherSnapshot.findMany({ where: { farmId }, select: { id: true, payload: true } }),
  ]);
  const mockActivityIds = activities.filter((row) => /^Sample /i.test(row.notes ?? "")).map((row) => row.id);
  const mock = {
    tasks: tasks.filter((row) => MOCK_TASKS.includes(row.name)),
    activities: activities.filter((row) => /^Sample /i.test(row.notes ?? "")),
    expenses: expenses.filter((row) => ["Corn seed", "Field labor", "Nitrogen fertilizer"].includes(row.description)),
    fieldNotes: notes.filter((row) => row.body.startsWith("Sample record:")),
    issues: issues.filter((row) => (row.description ?? "").startsWith("Sample issue:")),
    budgets: budgets.filter((row) => row.name === "2026 corn pilot budget"),
    inventory: inventory.filter((row) => MOCK_INVENTORY.includes(row.name)),
    equipment: equipment.filter((row) => MOCK_EQUIPMENT.includes(row.name)),
    irrigationEvents: irrigationEvents.filter((row) => Boolean(row.activityId && mockActivityIds.includes(row.activityId))),
    recommendations: [] as typeof recommendations,
    weatherAlerts: [] as typeof alerts,
    notifications: [] as typeof notifications,
    weather: weather.filter((row) => Boolean((row.payload as Record<string, unknown> | null)?.sample)),
    guideArticles: sampleGuideArticles,
  };
  const unexpected = {
    tasks: tasks.length - mock.tasks.length, activities: activities.length - mock.activities.length,
    expenses: expenses.length - mock.expenses.length, fieldNotes: notes.length - mock.fieldNotes.length,
    issues: issues.length - mock.issues.length, budgets: budgets.length - mock.budgets.length,
    inventory: inventory.length - mock.inventory.length, equipment: equipment.length - mock.equipment.length,
    irrigationEvents: irrigationEvents.length - mock.irrigationEvents.length,
    recommendations: recommendations.length,
    weatherAlerts: alerts.length,
    notifications: notifications.length,
  };
  const counts = Object.fromEntries(Object.entries(mock).map(([key, rows]) => [key, rows.length]));
  console.log(JSON.stringify({ mode: execute ? "EXECUTE" : "DRY_RUN", farm: { id: farm.id, name: farm.name }, wouldRemove: counts, preserved: { usersAndMemberships: true, fields: fieldIds.length, sectors: sectorIds.length, cropCycles: cycleIds.length, liveWeatherSnapshots: weather.length - mock.weather.length }, unexpectedOperationalRecords: unexpected }, null, 2));
  if (!execute) return;
  if (args.get("production-confirmation") !== "CLEAN_FARMPULSE_PRODUCTION") throw new Error("Execution requires --production-confirmation=CLEAN_FARMPULSE_PRODUCTION.");
  if (args.get("backup-confirmed") !== "true") throw new Error("Execution requires --backup-confirmed after verifying a recoverable database backup.");
  const adminEmail = args.get("admin-email")?.toLowerCase();
  if (!adminEmail) throw new Error("Execution requires --admin-email=<active farm administrator>.");
  const actor = await prisma.farmMembership.findFirst({ where: { farmId, role: "ADMIN", user: { email: adminEmail, active: true } }, select: { userId: true } });
  if (!actor) throw new Error("The supplied administrator is not an active administrator of the target farm.");
  if (Object.values(unexpected).some((count) => count > 0)) throw new Error("Unexpected real-looking operational records exist. Cleanup stopped without changes; classify them before retrying.");
  const attachmentCount = [...mock.activities, ...mock.expenses, ...mock.fieldNotes].reduce((sum, row) => sum + row._count.attachments, 0);
  if (attachmentCount) throw new Error("Mock candidates have attachments. Cleanup stopped because object storage deletion requires explicit review.");

  await prisma.$transaction(async (tx) => {
    const activityIds = mock.activities.map((row) => row.id), itemIds = mock.inventory.map((row) => row.id), equipmentIds = mock.equipment.map((row) => row.id);
    await tx.irrigationEvent.deleteMany({ where: { activityId: { in: activityIds } } });
    await tx.inventoryTransaction.deleteMany({ where: { itemId: { in: itemIds } } });
    await tx.maintenanceRecord.deleteMany({ where: { equipmentId: { in: equipmentIds } } });
    await tx.issue.deleteMany({ where: { id: { in: mock.issues.map((row) => row.id) } } });
    await tx.activity.deleteMany({ where: { id: { in: activityIds } } });
    await tx.expense.deleteMany({ where: { id: { in: mock.expenses.map((row) => row.id) } } });
    await tx.task.deleteMany({ where: { id: { in: mock.tasks.map((row) => row.id) } } });
    await tx.fieldNote.deleteMany({ where: { id: { in: mock.fieldNotes.map((row) => row.id) } } });
    await tx.budget.deleteMany({ where: { id: { in: mock.budgets.map((row) => row.id) } } });
    await tx.inventoryItem.deleteMany({ where: { id: { in: itemIds } } });
    await tx.equipment.deleteMany({ where: { id: { in: equipmentIds } } });
    await tx.weatherSnapshot.deleteMany({ where: { id: { in: mock.weather.map((row) => row.id) } } });
    await tx.cropGuideArticle.deleteMany({ where: { id: { in: sampleGuideArticles.map((row) => row.id) } } });
    await tx.cropGuide.updateMany({ where: { id: { in: sampleGuideArticles.map((row) => row.guideId) } }, data: { title: "Corn field guide" } });
    const planning = await tx.growthStage.findFirst({ where: { crop: { name: "Corn" }, name: "Planning" } });
    await tx.cropCycle.updateMany({ where: { id: { in: cycleIds }, status: "ACTIVE" }, data: { growthStageId: planning?.id, variety: null, plannedPlantingDate: null, actualPlantingDate: null, expectedHarvestDate: null, actualHarvestDate: null, seedQuantityKg: null, populationTarget: null, expectedYieldKg: null, actualYieldKg: null, notes: "Land preparation has not yet started or is beginning." } });
    await tx.sector.updateMany({ where: { id: { in: sectorIds } }, data: { status: "Planning" } });
    await tx.auditLog.create({ data: { farmId, userId: actor.userId, action: "PRODUCTION_MOCK_DATA_CLEANUP", entityType: "Farm", entityId: farmId, metadata: { version: 1, removed: counts, preserved: { usersAndMemberships: true, fields: fieldIds.length, sectors: sectorIds.length }, initialRealTasksCreated: false } } });
  });
  console.log("Cleanup committed. Run npm run db:verify:production -- --farm=" + farmId);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
