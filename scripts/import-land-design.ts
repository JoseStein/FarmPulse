import "dotenv/config";
import { Prisma, PrismaClient, Status } from "@prisma/client";
import { LAND_DESIGN_SETTING_KEY, MAY_2024_LAND_DESIGN } from "../lib/land-design";

const prisma = new PrismaClient();
const execute = process.argv.includes("--execute");
const confirmation = process.argv.find((arg) => arg.startsWith("--confirm="))?.split("=")[1];
const REQUIRED_CONFIRMATION = "IMPORT_MAY_2024_LAND_DESIGN";

const UNASSIGNED_STAGES = ["Planning", "Land preparation", "Planting"];

async function operationalCounts(farmId: string) {
  const fieldWhere = { field: { farmId } };
  const sectorIds = (await prisma.sector.findMany({
    where: { field: { farmId } },
    select: { id: true },
  })).map((sector) => sector.id);
  const [tasks, activities, expenses, notes, issues, irrigationEvents, budgets, recommendations] = await Promise.all([
    prisma.task.count({ where: fieldWhere }),
    prisma.activity.count({ where: fieldWhere }),
    prisma.expense.count({ where: fieldWhere }),
    prisma.fieldNote.count({ where: fieldWhere }),
    prisma.issue.count({ where: fieldWhere }),
    prisma.irrigationEvent.count({ where: { sector: { field: { farmId } } } }),
    prisma.budget.count({ where: { farmId } }),
    prisma.recommendation.count({ where: { sectorId: { in: sectorIds } } }),
  ]);
  return { tasks, activities, expenses, notes, issues, irrigationEvents, budgets, recommendations };
}

async function ensureStages(tx: Prisma.TransactionClient, cropId: string, names: string[]) {
  const stages = [];
  for (const [order, name] of names.entries()) {
    stages.push(await tx.growthStage.upsert({
      where: { cropId_name: { cropId, name } },
      update: { order },
      create: { cropId, name, order },
    }));
  }
  return stages;
}

async function main() {
  const farm = await prisma.farm.findFirst({ orderBy: { createdAt: "asc" } });
  if (!farm) throw new Error("No FarmPulse farm exists.");
  const [fields, counts] = await Promise.all([
    prisma.field.findMany({ where: { farmId: farm.id, deletedAt: null }, include: { sectors: { orderBy: { name: "asc" } }, cycles: { where: { status: Status.ACTIVE }, orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "asc" } }),
    operationalCounts(farm.id),
  ]);
  const unexpectedOperationalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const alreadyImported = MAY_2024_LAND_DESIGN.lots.every((lot) => fields.some((field) => field.name === lot.name));
  const dryRun = {
    mode: execute ? "EXECUTE" : "DRY_RUN",
    farmId: farm.id,
    currentFields: fields.map((field) => ({ id: field.id, name: field.name, sectors: field.sectors.length, activeCycles: field.cycles.length })),
    proposedLots: MAY_2024_LAND_DESIGN.lots.map((lot) => ({ name: lot.name, plannedCrop: "Crop not selected", drawingExampleCrop: lot.drawingExampleCrop, areaHa: lot.areaHa, irrigationZones: 1, plannedDripLines: lot.beds * MAY_2024_LAND_DESIGN.irrigation.tapesPerBed })),
    plannedAssets: ["River intake pump", "Gravel filter", "24,000 L storage tank", "Irrigation pressure pump", "Disk filter", "Gate valves 1–4"],
    designDiscrepanciesPreserved: MAY_2024_LAND_DESIGN.discrepancies.map((item) => item.title),
    operationalRecords: counts,
    unexpectedOperationalRecords,
    alreadyImported,
    safeToExecute: unexpectedOperationalRecords === 0,
  };
  console.log(JSON.stringify(dryRun, null, 2));
  if (!execute) return;
  if (confirmation !== REQUIRED_CONFIRMATION) throw new Error(`Execution requires --confirm=${REQUIRED_CONFIRMATION}`);
  if (unexpectedOperationalRecords > 0)
    throw new Error("Import refused: operational records exist and could be assigned to the wrong production lot. Review and migrate them explicitly first.");
  if (!alreadyImported && (fields.length !== 1 || fields[0].sectors.length !== 4))
    throw new Error("Import refused: expected one legacy field with exactly four structural sectors.");

  await prisma.$transaction(async (tx) => {
    const designJson = JSON.parse(JSON.stringify(MAY_2024_LAND_DESIGN)) as Prisma.InputJsonValue;
    const unassignedCrop = await tx.crop.upsert({ where: { name: "Crop not selected" }, update: {}, create: { name: "Crop not selected" } });
    const unassignedStages = await ensureStages(tx, unassignedCrop.id, UNASSIGNED_STAGES);

    const lotFields = [];
    for (const lot of MAY_2024_LAND_DESIGN.lots) {
      let field = await tx.field.findFirst({ where: { farmId: farm.id, name: lot.name, deletedAt: null } });
      if (!field && lot.number === 1 && !alreadyImported) {
        field = await tx.field.update({ where: { id: fields[0].id }, data: { name: lot.name, areaHa: lot.areaHa, status: Status.ACTIVE } });
      }
      if (!field) field = await tx.field.create({ data: { farmId: farm.id, name: lot.name, areaHa: lot.areaHa, status: Status.ACTIVE } });
      lotFields.push(field);
    }

    const legacySectors = !alreadyImported ? fields[0].sectors : [];
    if (legacySectors.length) await tx.cropCycleSector.deleteMany({ where: { sectorId: { in: legacySectors.map((sector) => sector.id) } } });
    const lotSectors = [];
    for (const [index, field] of lotFields.entries()) {
      let sector = await tx.sector.findFirst({ where: { fieldId: field.id, name: "Irrigation Zone" } });
      if (!sector && legacySectors[index]) {
        sector = await tx.sector.update({
          where: { id: legacySectors[index].id },
          data: { fieldId: field.id, name: "Irrigation Zone", dripLines: 200, status: "Planned — not field verified" },
        });
      }
      if (!sector) sector = await tx.sector.create({ data: { fieldId: field.id, name: "Irrigation Zone", dripLines: 200, status: "Planned — not field verified" } });
      lotSectors.push(sector);
    }

    for (const [index, field] of lotFields.entries()) {
      let cycle = await tx.cropCycle.findFirst({ where: { fieldId: field.id, status: Status.ACTIVE }, orderBy: { createdAt: "desc" } });
      const cycleData = {
        cropId: unassignedCrop.id,
        growthStageId: unassignedStages[0].id,
        variety: null,
        plannedPlantingDate: null,
        actualPlantingDate: null,
        expectedHarvestDate: null,
        actualHarvestDate: null,
        seedQuantityKg: null,
        populationTarget: null,
        expectedYieldKg: null,
        actualYieldKg: null,
        status: Status.ACTIVE,
        notes: "Planned from May 2024 land design. No crop is assigned; crop labels on the drawing are illustrative examples only. Dates, quantities, and installation remain unverified.",
      };
      cycle = cycle
        ? await tx.cropCycle.update({ where: { id: cycle.id }, data: cycleData })
        : await tx.cropCycle.create({ data: { fieldId: field.id, ...cycleData } });
      await tx.cropCycleSector.upsert({ where: { cropCycleId_sectorId: { cropCycleId: cycle.id, sectorId: lotSectors[index].id } }, update: {}, create: { cropCycleId: cycle.id, sectorId: lotSectors[index].id } });
    }

    await tx.appSetting.upsert({
      where: { farmId_key: { farmId: farm.id, key: LAND_DESIGN_SETTING_KEY } },
      update: { value: designJson },
      create: { farmId: farm.id, key: LAND_DESIGN_SETTING_KEY, value: designJson },
    });
    await tx.appSetting.upsert({
      where: { farmId_key: { farmId: farm.id, key: "irrigation_design" } },
      update: { value: { source: "Río Chico", status: "PLANNED_NOT_FIELD_VERIFIED", rows: 100, rowLengthM: 100, dripTapeMm: 16, tapesPerBed: 2, emitterSpacingM: 0.2, storageTankLiters: 24000, mainPipeInches: 4, secondaryPipeInches: 2, sectorFlowM3h: null, targetPressureBar: null, discrepancyFlags: ["production-area", "emitter-count"] } },
      create: { farmId: farm.id, key: "irrigation_design", value: { source: "Río Chico", status: "PLANNED_NOT_FIELD_VERIFIED", rows: 100, rowLengthM: 100, dripTapeMm: 16, tapesPerBed: 2, emitterSpacingM: 0.2, storageTankLiters: 24000, mainPipeInches: 4, secondaryPipeInches: 2, sectorFlowM3h: null, targetPressureBar: null, discrepancyFlags: ["production-area", "emitter-count"] } },
    });

    const assets = [
      ["River intake pump", "Pump"], ["Gravel filter", "Filter"], ["24,000 L storage tank", "Storage tank"],
      ["Irrigation pressure pump", "Pump"], ["Disk filter", "Filter"],
      ...MAY_2024_LAND_DESIGN.lots.map((lot) => [`Gate valve ${lot.number}`, "Irrigation valve"]),
    ] as const;
    for (const [name, type] of assets) {
      const existing = await tx.equipment.findFirst({ where: { farmId: farm.id, name } });
      if (!existing) await tx.equipment.create({ data: { farmId: farm.id, name, type, status: "Planned — not field verified", notes: "Transcribed from the May 2024 irrigation design. Installation and operating condition are not verified." } });
    }
    await tx.auditLog.create({
      data: { farmId: farm.id, action: "IMPORT_LAND_DESIGN", entityType: "Farm", entityId: farm.id, metadata: { revision: "May 2024", lots: 4, evidenceStatus: "PLANNED_NOT_FIELD_VERIFIED", discrepancies: ["production-area", "emitter-count"] } },
    });
  });
  console.log(JSON.stringify({ imported: true, lots: 4, cropCycles: { cropAssignment: "NOT_SELECTED", count: 4 }, drawingCropLabels: "ILLUSTRATIVE_ONLY", evidenceStatus: "PLANNED_NOT_FIELD_VERIFIED" }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
