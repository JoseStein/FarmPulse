import "dotenv/config";
import { PrismaClient, Role, Status } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const STAGES = ["Planning", "Land preparation", "Planting", "Establishment", "Growth", "Harvest", "Completed"];

export async function initializeProduction() {
  const email = (process.env.INITIAL_ADMIN_EMAIL || "admin@farmpulse.local").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  let farm = await prisma.farm.findFirst({ where: { name: "FarmPulse Panama Pilot" } });
  if (!farm) farm = await prisma.farm.create({ data: { name: "FarmPulse Panama Pilot", locationName: "El Cortezo, Coclé, Panama", country: "Panama", timezone: "America/Panama", currency: "USD", unitSystem: "METRIC", latitude: 8.346170, longitude: -80.587052 } });
  const existingAdministrator = await prisma.farmMembership.findFirst({ where: { farmId: farm.id, role: Role.ADMIN, user: { active: true } }, include: { user: true } });
  let admin = existingAdministrator?.user ?? null;
  if (!admin) {
    admin = await prisma.user.findUnique({ where: { email } });
    if (!admin) {
      if (!password || password.length < 12) throw new Error("A new installation requires SEED_ADMIN_PASSWORD with at least 12 characters.");
      admin = await prisma.user.create({ data: { email, name: "Admin", passwordHash: await bcrypt.hash(password, 12), role: Role.ADMIN } });
    }
    if (!admin.active) throw new Error("The initial administrator account exists but is inactive; reactivate it through an approved administrative process.");
    if (admin.role !== Role.ADMIN) admin = await prisma.user.update({ where: { id: admin.id }, data: { role: Role.ADMIN } });
    await prisma.farmMembership.upsert({ where: { farmId_userId: { farmId: farm.id, userId: admin.id } }, update: { role: Role.ADMIN }, create: { farmId: farm.id, userId: admin.id, role: Role.ADMIN } });
  }

  const importedLot = await prisma.field.findFirst({ where: { farmId: farm.id, name: "Lot 1", deletedAt: null } });
  if (importedLot) {
    const importedCycle = await prisma.cropCycle.findFirst({ where: { fieldId: importedLot.id, status: Status.ACTIVE }, orderBy: { createdAt: "desc" } });
    if (!importedCycle) throw new Error("Lot 1 exists without an active crop cycle; repair the imported land design before deploying.");
    console.log("Production structure ready", { farmId: farm.id, fieldId: importedLot.id, cycleId: importedCycle.id, landDesign: "May 2024" });
    return { farm, field: importedLot, cycle: importedCycle, admin };
  }

  let field = await prisma.field.findFirst({ where: { farmId: farm.id, name: "Field 1" } });
  if (!field) field = await prisma.field.create({ data: { farmId: farm.id, name: "Field 1", areaHa: 1, status: Status.ACTIVE } });
  const sectors = [];
  for (let i = 1; i <= 4; i++) sectors.push(await prisma.sector.upsert({ where: { fieldId_name: { fieldId: field.id, name: `Sector ${i}` } }, update: {}, create: { fieldId: field.id, name: `Sector ${i}`, dripLines: i === 3 ? 34 : 33, status: "Planning" } }));
  const crop = await prisma.crop.upsert({ where: { name: "Crop not selected" }, update: {}, create: { name: "Crop not selected" } });
  const stages = [];
  for (const [order, name] of STAGES.entries()) stages.push(await prisma.growthStage.upsert({ where: { cropId_name: { cropId: crop.id, name } }, update: { order }, create: { cropId: crop.id, name, order } }));
  let cycle = await prisma.cropCycle.findFirst({ where: { fieldId: field.id, status: Status.ACTIVE } });
  if (!cycle) cycle = await prisma.cropCycle.create({ data: { fieldId: field.id, cropId: crop.id, growthStageId: stages[0].id, status: Status.ACTIVE, notes: "Land preparation has not yet started or is beginning." } });
  for (const sector of sectors) await prisma.cropCycleSector.upsert({ where: { cropCycleId_sectorId: { cropCycleId: cycle.id, sectorId: sector.id } }, update: {}, create: { cropCycleId: cycle.id, sectorId: sector.id } });
  await prisma.appSetting.upsert({ where: { farmId_key: { farmId: farm.id, key: "irrigation_design" } }, update: {}, create: { farmId: farm.id, key: "irrigation_design", value: { rows: 133, rowLengthM: 100, rowSpacingM: 0.75, plantSpacingM: 0.22, dripTapeMm: 16, emitterSpacingM: 0.30, sectorFlowM3h: 11, targetPressureBar: [1, 1.5], storageTankLiters: 24000 } } });
  console.log("Production structure ready", { farmId: farm.id, fieldId: field.id, cycleId: cycle.id, sectors: sectors.length, administrator: admin.email });
  return { farm, field, cycle, admin };
}

if (process.argv[1]?.endsWith("initialize-production.ts")) initializeProduction().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
