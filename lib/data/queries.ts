import "server-only";
import { prisma } from "@/lib/prisma";
import { decimal, iso } from "./serialize";
import { farmDayBounds, farmWeekBounds, nextFarmDays } from "./dates";
import { requireActiveCycle, requireActiveField, requireFarmContext } from "./context";
import { irrigationRecommendation } from "@/lib/utils";
import type { Prisma, TaskStatus } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";

const taskSelect = {
  id: true,
  name: true,
  description: true,
  category: true,
  priority: true,
  dueAt: true,
  status: true,
  completionNotes: true,
  completedAt: true,
  sector: { select: { id: true, name: true } },
  assignedUser: { select: { id: true, name: true } },
  completedBy: { select: { id: true, name: true } },
  relatedActivity: { select: { id: true } },
} satisfies Prisma.TaskSelect;

export async function getCurrentUser() {
  const { user, role } = await requireFarmContext();
  return { ...user, role };
}
export async function getFarmMembership() {
  return requireFarmContext();
}
export async function getActiveFarm() {
  const { farm } = await requireFarmContext();
  return { ...farm, latitude: decimal(farm.latitude)!, longitude: decimal(farm.longitude)! };
}
export async function getFarmUsers() {
  const context = await requireFarmContext();
  return prisma.farmMembership.findMany({
    where: { farmId: context.farm.id },
    select: {
      role: true,
      user: { select: { id: true, name: true, email: true, active: true, createdAt: true } },
    },
    orderBy: { user: { name: "asc" } },
  }).then((memberships) => memberships.map(({ role, user }) => ({
    ...user,
    role,
    createdAt: user.createdAt.toISOString(),
  })));
}
export async function getActiveField() {
  const { field } = await requireActiveField();
  return { ...field, areaHa: decimal(field.areaHa)! };
}
export async function getShellData() {
  const context = await requireActiveCycle();
  const [taskCount, notificationCount] = await Promise.all([
    prisma.task.count({ where: { fieldId: context.field.id, status: { notIn: ["COMPLETED", "SKIPPED"] } } }),
    prisma.notification.count({ where: { userId: context.user.id, readAt: null } }),
  ]);
  return {
    user: { ...context.user, role: context.role },
    farm: { id: context.farm.id, name: context.farm.name },
    field: { id: context.field.id, name: context.field.name },
    crop: context.cycle.crop.name,
    taskCount,
    notificationCount,
  };
}
export async function getActiveCropCycle() {
  const { cycle } = await requireActiveCycle();
  return {
    ...cycle,
    seedQuantityKg: decimal(cycle.seedQuantityKg),
    expectedYieldKg: decimal(cycle.expectedYieldKg),
    actualYieldKg: decimal(cycle.actualYieldKg),
    plannedPlantingDate: iso(cycle.plannedPlantingDate)!,
    actualPlantingDate: iso(cycle.actualPlantingDate),
    expectedHarvestDate: iso(cycle.expectedHarvestDate),
    actualHarvestDate: iso(cycle.actualHarvestDate),
    createdAt: iso(cycle.createdAt)!,
    updatedAt: iso(cycle.updatedAt)!,
  };
}

export async function getCropCyclePageData() {
  const context = await requireActiveCycle();
  const [cycle, stages] = await Promise.all([
    getActiveCropCycle(),
    prisma.growthStage.findMany({
      where: { cropId: context.cycle.cropId },
      select: { id: true, name: true, order: true },
      orderBy: { order: "asc" },
    }),
  ]);
  return {
    cycle,
    stages,
    role: context.role,
    timezone: context.farm.timezone,
    now: new Date().toISOString(),
    field: { ...context.field, areaHa: decimal(context.field.areaHa)! },
  };
}

function displayTaskStatus(status: TaskStatus, dueAt: Date, timezone: string): TaskStatus {
  if (["COMPLETED", "SKIPPED", "IN_PROGRESS"].includes(status)) return status;
  const { start, end } = farmDayBounds(timezone);
  if (dueAt < start) return "OVERDUE";
  if (dueAt <= end) return "DUE_TODAY";
  return "PLANNED";
}

export async function getTasks(view: "today" | "week" | "all" | "sector" = "today", sectorId?: string) {
  const { farm, field } = await requireActiveField();
  const today = farmDayBounds(farm.timezone);
  const week = farmWeekBounds(farm.timezone);
  const where: Prisma.TaskWhereInput = { fieldId: field.id };
  if (view === "today")
    where.OR = [
      { dueAt: { gte: today.start, lte: today.end } },
      { status: { in: ["OVERDUE", "IN_PROGRESS"] } },
    ];
  if (view === "week") where.dueAt = { gte: week.start, lte: week.end };
  if (view === "sector" && sectorId) where.sectorId = sectorId;
  const rows = await prisma.task.findMany({
    where,
    select: taskSelect,
    orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
    take: 100,
  });
  return rows.map((row) => ({
    ...row,
    dueAt: iso(row.dueAt)!,
    completedAt: iso(row.completedAt),
    status: displayTaskStatus(row.status, row.dueAt, farm.timezone),
  }));
}

export async function getTaskPageData(
  view: "today" | "week" | "all" | "sector" = "today",
  sectorId?: string,
) {
  const context = await requireActiveField();
  const [tasks, sectors, members] = await Promise.all([
    getTasks(view, sectorId),
    prisma.sector.findMany({
      where: { fieldId: context.field.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.farmMembership.findMany({
      where: { farmId: context.farm.id },
      select: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);
  return {
    tasks,
    sectors,
    members: members.map((m) => m.user),
    role: context.role,
    timezone: context.farm.timezone,
    tomorrowDate: formatInTimeZone(new Date(Date.now() + 864e5), context.farm.timezone, "yyyy-MM-dd"),
  };
}

export async function getActivities(limit = 30, sectorId?: string) {
  const { field } = await requireActiveField();
  const rows = await prisma.activity.findMany({
    where: { fieldId: field.id, ...(sectorId ? { sectorId } : {}) },
    orderBy: { occurredAt: "desc" },
    take: Math.min(limit, 100),
    include: {
      sector: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      irrigationEvent: true,
      attachments: true,
    },
  });
  return rows.map((row) => ({
    ...row,
    occurredAt: iso(row.occurredAt)!,
    startTime: iso(row.startTime),
    endTime: iso(row.endTime),
    quantity: decimal(row.quantity),
    cost: decimal(row.cost),
    createdAt: iso(row.createdAt)!,
    updatedAt: iso(row.updatedAt)!,
    attachments: row.attachments.map((a) => ({ ...a, createdAt: iso(a.createdAt)! })),
    irrigationEvent: row.irrigationEvent
      ? {
          ...row.irrigationEvent,
          startedAt: iso(row.irrigationEvent.startedAt)!,
          flowM3h: decimal(row.irrigationEvent.flowM3h)!,
          estimatedLiters: decimal(row.irrigationEvent.estimatedLiters)!,
          pressureBar: decimal(row.irrigationEvent.pressureBar),
          createdAt: iso(row.irrigationEvent.createdAt)!,
        }
      : null,
  }));
}

export async function getActivityPageData() {
  const context = await requireActiveCycle();
  const [sectors, activities, design, inventory] = await Promise.all([
    prisma.sector.findMany({
      where: { fieldId: context.field.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getActivities(12),
    prisma.appSetting.findUnique({
      where: { farmId_key: { farmId: context.farm.id, key: "irrigation_design" } },
    }),
    prisma.inventoryItem.findMany({
      where: { farmId: context.farm.id, deletedAt: null },
      select: { id: true, name: true, quantityOnHand: true, unit: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const flowM3h = Number((design?.value as Record<string, unknown> | null)?.sectorFlowM3h ?? 11);
  return {
    field: { id: context.field.id, name: context.field.name },
    cycle: { id: context.cycle.id, crop: context.cycle.crop.name },
    user: context.user,
    role: context.role,
    timezone: context.farm.timezone,
    today: formatInTimeZone(new Date(), context.farm.timezone, "yyyy-MM-dd"),
    currentTime: formatInTimeZone(new Date(), context.farm.timezone, "HH:mm"),
    sectors: sectors.map((s) => ({ ...s, flowM3h })),
    inventory: inventory.map((i) => ({ ...i, quantityOnHand: decimal(i.quantityOnHand)! })),
    activities,
  };
}

export async function getIrrigationEvents(limit = 50, sectorId?: string) {
  const { field } = await requireActiveField();
  const rows = await prisma.irrigationEvent.findMany({
    where: { sector: { fieldId: field.id }, ...(sectorId ? { sectorId } : {}) },
    include: { sector: { select: { id: true, name: true } } },
    orderBy: { startedAt: "desc" },
    take: Math.min(limit, 100),
  });
  return rows.map((row) => ({
    ...row,
    startedAt: iso(row.startedAt)!,
    flowM3h: decimal(row.flowM3h)!,
    estimatedLiters: decimal(row.estimatedLiters)!,
    pressureBar: decimal(row.pressureBar),
    createdAt: iso(row.createdAt)!,
  }));
}

export async function getExpenseData(filters?: {
  category?: string;
  sectorId?: string;
  from?: Date;
  to?: Date;
}) {
  const { farm, field, role } = await requireActiveField();
  const where: Prisma.ExpenseWhereInput = {
    fieldId: field.id,
    deletedAt: null,
    ...(filters?.category ? { category: filters.category } : {}),
    ...(filters?.sectorId ? { sectorId: filters.sectorId } : {}),
    ...(filters?.from || filters?.to ? { date: { gte: filters.from, lte: filters.to } } : {}),
  };
  const [rows, aggregate, byCategory, bySector, budget] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        sector: { select: { id: true, name: true } },
        enteredBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    prisma.expense.groupBy({
      by: ["category"],
      where,
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.expense.groupBy({ by: ["sectorId"], where, _sum: { amount: true } }),
    prisma.budget.findFirst({ where: { farmId: farm.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const actual = decimal(aggregate._sum.amount) ?? 0;
  const planned = decimal(budget?.plannedAmount) ?? 0;
  return {
    role,
    currency: farm.currency,
    areaHa: decimal(field.areaHa)!,
    rows: rows.map((row) => ({
      ...row,
      date: iso(row.date)!,
      amount: decimal(row.amount)!,
      quantity: decimal(row.quantity),
      unitCost: decimal(row.unitCost),
      createdAt: iso(row.createdAt)!,
      updatedAt: iso(row.updatedAt)!,
    })),
    totals: {
      actual,
      planned,
      remaining: planned - actual,
      variance: planned - actual,
      percentUsed: planned ? (actual / planned) * 100 : 0,
    },
    byCategory: byCategory.map((x) => ({ category: x.category, amount: decimal(x._sum.amount) ?? 0 })),
    bySector: bySector.map((x) => ({ sectorId: x.sectorId, amount: decimal(x._sum.amount) ?? 0 })),
  };
}

export async function getExpensePageData(filters?: {
  category?: string;
  sectorId?: string;
  from?: Date;
  to?: Date;
}) {
  const context = await requireActiveField();
  const [expenseData, sectors, categories] = await Promise.all([
    getExpenseData(filters),
    prisma.sector.findMany({
      where: { fieldId: context.field.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.expense.findMany({
      where: { fieldId: context.field.id, deletedAt: null },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
  ]);
  return { ...expenseData, sectors, categories: categories.map((c) => c.category) };
}

export async function getInventory() {
  const { farm, role } = await requireFarmContext();
  const rows = await prisma.inventoryItem.findMany({
    where: { farmId: farm.id, deletedAt: null },
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 5 } },
    orderBy: { name: "asc" },
  });
  return {
    role,
    items: rows.map((row) => ({
      ...row,
      quantityOnHand: decimal(row.quantityOnHand)!,
      minimumThreshold: decimal(row.minimumThreshold)!,
      unitCost: decimal(row.unitCost),
      expirationDate: iso(row.expirationDate),
      createdAt: iso(row.createdAt)!,
      updatedAt: iso(row.updatedAt)!,
      deletedAt: iso(row.deletedAt),
      transactions: row.transactions.map((t) => ({
        ...t,
        quantity: decimal(t.quantity)!,
        createdAt: iso(t.createdAt)!,
      })),
    })),
    estimatedValue: rows.reduce(
      (sum, row) => sum + Number(row.quantityOnHand) * Number(row.unitCost ?? 0),
      0,
    ),
    lowStockCount: rows.filter((row) => row.quantityOnHand.lte(row.minimumThreshold)).length,
  };
}

export async function getEquipment() {
  const { farm, role } = await requireFarmContext();
  const rows = await prisma.equipment.findMany({
    where: { farmId: farm.id },
    include: { maintenanceRecords: { orderBy: { performedAt: "desc" }, take: 5 } },
    orderBy: { name: "asc" },
  });
  return {
    role,
    items: rows.map((row) => ({
      ...row,
      runtimeHours: decimal(row.runtimeHours),
      purchaseDate: iso(row.purchaseDate),
      lastMaintenance: iso(row.lastMaintenance),
      nextMaintenance: iso(row.nextMaintenance),
      createdAt: iso(row.createdAt)!,
      updatedAt: iso(row.updatedAt)!,
      maintenanceRecords: row.maintenanceRecords.map((m) => ({
        ...m,
        performedAt: iso(m.performedAt)!,
        cost: decimal(m.cost),
        runtimeHours: decimal(m.runtimeHours),
        createdAt: iso(m.createdAt)!,
      })),
    })),
  };
}

export async function getFieldJournal(limit = 50, sectorId?: string) {
  const { field, role } = await requireActiveField();
  const [notes, issues] = await Promise.all([
    prisma.fieldNote.findMany({
      where: { fieldId: field.id, deletedAt: null, ...(sectorId ? { sectorId } : {}) },
      include: {
        sector: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        attachments: true,
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    }),
    prisma.issue.findMany({
      where: { fieldId: field.id, ...(sectorId ? { sectorId } : {}) },
      include: {
        sector: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
        followUpTask: { select: { id: true, name: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    }),
  ]);
  return {
    role,
    notes: notes.map((n) => ({
      ...n,
      createdAt: iso(n.createdAt)!,
      updatedAt: iso(n.updatedAt)!,
      deletedAt: iso(n.deletedAt),
      attachments: n.attachments.map((a) => ({ ...a, createdAt: iso(a.createdAt)! })),
    })),
    issues: issues.map((i) => ({
      ...i,
      createdAt: iso(i.createdAt)!,
      updatedAt: iso(i.updatedAt)!,
      resolvedAt: iso(i.resolvedAt),
    })),
  };
}

export async function getJournalPageData() {
  const context = await requireActiveCycle();
  const [journal, sectors, members] = await Promise.all([
    getFieldJournal(100),
    prisma.sector.findMany({
      where: { fieldId: context.field.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.farmMembership.findMany({
      where: { farmId: context.farm.id },
      select: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);
  return { ...journal, sectors, members: members.map((m) => m.user), timezone: context.farm.timezone };
}

export async function getWeatherSnapshots(limit = 20) {
  const { farm } = await requireFarmContext();
  const rows = await prisma.weatherSnapshot.findMany({
    where: { farmId: farm.id },
    orderBy: { observedAt: "desc" },
    take: Math.min(limit, 100),
  });
  return rows.map((w) => ({
    ...w,
    observedAt: iso(w.observedAt)!,
    temperatureC: decimal(w.temperatureC),
    windKph: decimal(w.windKph),
    precipitationMm: decimal(w.precipitationMm),
    createdAt: iso(w.createdAt)!,
  }));
}
export async function getCropGuideArticles(search?: string) {
  const { cycle } = await requireActiveCycle();
  const rows = await prisma.cropGuideArticle.findMany({
    where: {
      guide: { cropId: cycle.cropId },
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { summary: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
  return rows.map((a) => ({
    ...a,
    lastReviewedAt: iso(a.lastReviewedAt),
    createdAt: iso(a.createdAt)!,
    updatedAt: iso(a.updatedAt)!,
  }));
}

export async function getSectorSummaries() {
  const { farm, field, cycle, user, role } = await requireActiveCycle();
  const cycleStart = cycle.actualPlantingDate ?? cycle.plannedPlantingDate;
  const [setting, sectors, totals, weather] = await Promise.all([
    prisma.appSetting.findUnique({ where: { farmId_key: { farmId: farm.id, key: "irrigation_design" } } }),
    prisma.sector.findMany({
      where: { fieldId: field.id },
      include: {
        irrigationEvents: { orderBy: { startedAt: "desc" }, take: 1 },
        tasks: { where: { status: { notIn: ["COMPLETED", "SKIPPED"] } }, orderBy: { dueAt: "asc" }, take: 3 },
        issues: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } }, orderBy: { severity: "desc" } },
        _count: { select: { irrigationEvents: { where: { startedAt: { gte: cycleStart } } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.irrigationEvent.groupBy({
      by: ["sectorId"],
      where: { sector: { fieldId: field.id }, startedAt: { gte: cycleStart } },
      _sum: { estimatedLiters: true },
      _count: { _all: true },
    }),
    prisma.weatherSnapshot.findFirst({ where: { farmId: farm.id }, orderBy: { observedAt: "desc" } }),
  ]);
  const design = (setting?.value ?? {}) as Record<string, unknown>;
  const forecastRain = Number((weather?.payload as Record<string, unknown> | null)?.forecastRain24Mm ?? 0);
  const recentRain = Number(weather?.precipitationMm ?? 0);
  return {
    user: { ...user, role },
    farm: { ...farm, latitude: decimal(farm.latitude)!, longitude: decimal(farm.longitude)! },
    field: { ...field, areaHa: decimal(field.areaHa)! },
    cycle: { id: cycle.id, crop: cycle.crop.name, stage: cycle.growthStage?.name ?? "Not set" },
    design,
    sectors: sectors.map((sector) => {
      const last = sector.irrigationEvents[0];
      const hours = last ? Math.max(0, (Date.now() - last.startedAt.getTime()) / 36e5) : 999;
      const rule = irrigationRecommendation({
        hoursSinceIrrigation: hours,
        rainLast24Mm: recentRain,
        forecastRain24Mm: forecastRain,
        stage: cycle.growthStage?.name ?? "",
      });
      const recommendation = {
        ...rule,
        dataUsed: {
          hoursSinceIrrigation: Number(hours.toFixed(1)),
          rainLast24Mm: recentRain,
          forecastRain24Mm: forecastRain,
          cropStage: cycle.growthStage?.name ?? "Not set",
          openIrrigationIssues: sector.issues.filter((i) =>
            /irrigation|leak|pump/i.test(`${i.category} ${i.title}`),
          ).length,
        },
        generatedAt: new Date().toISOString(),
      };
      const critical = sector.issues.some((i) => i.severity === "CRITICAL");
      const high = sector.issues.some((i) => i.severity === "HIGH");
      const overdue = sector.tasks.some((t) => t.dueAt < new Date() && t.priority === "CRITICAL");
      const status = critical
        ? "Critical"
        : high
          ? "Attention needed"
          : overdue
            ? "Task overdue"
            : recommendation.type === "IRRIGATE_TODAY"
              ? "Irrigation due"
              : "Healthy";
      const total = totals.find((t) => t.sectorId === sector.id);
      return {
        id: sector.id,
        name: sector.name,
        dripLines: sector.dripLines,
        status,
        alerts: sector.issues.length + sector.tasks.filter((t) => t.dueAt < new Date()).length,
        otherAlerts: [
          ...sector.issues.map((i) => i.title),
          ...sector.tasks.filter((t) => t.dueAt < new Date()).map((t) => t.name),
        ],
        openIrrigationIssues: sector.issues.filter((i) =>
          /irrigation|leak|pump/i.test(`${i.category} ${i.title}`),
        ).length,
        lastIrrigation: last
          ? {
              startedAt: iso(last.startedAt)!,
              durationMinutes: last.durationMinutes,
              estimatedLiters: decimal(last.estimatedLiters)!,
              pressureBar: decimal(last.pressureBar),
              flowM3h: decimal(last.flowM3h)!,
            }
          : null,
        nextTask: sector.tasks[0]
          ? { id: sector.tasks[0].id, name: sector.tasks[0].name, dueAt: iso(sector.tasks[0].dueAt)! }
          : null,
        recommendation,
        irrigationEventCount: total?._count._all ?? 0,
        totalEstimatedLiters: decimal(total?._sum.estimatedLiters) ?? 0,
      };
    }),
  };
}

export async function getSectorSummary(sectorId: string) {
  const summaries = await getSectorSummaries();
  const sector = summaries.sectors.find((s) => s.id === sectorId);
  if (!sector) return null;
  const [activities, tasks, journal, expenses, irrigation] = await Promise.all([
    getActivities(30, sectorId),
    getTasks("sector", sectorId),
    getFieldJournal(30, sectorId),
    getExpenseData({ sectorId }),
    getIrrigationEvents(30, sectorId),
  ]);
  return {
    ...summaries,
    sector,
    activities,
    tasks,
    notes: journal.notes,
    issues: journal.issues,
    expenses: expenses.rows,
    irrigation,
  };
}

export async function getDashboardSummary() {
  const { farm, field, cycle, user, role } = await requireActiveCycle();
  const today = farmDayBounds(farm.timezone);
  const upcoming = nextFarmDays(farm.timezone, 7);
  const [
    todayTasks,
    overdueCount,
    upcomingCount,
    recentActivities,
    recentNotes,
    expenseAgg,
    budget,
    lowStockCount,
    openIssues,
    criticalIssues,
    maintenanceDue,
    lastIrrigation,
    nextIrrigation,
    weather,
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        fieldId: field.id,
        dueAt: { gte: today.start, lte: today.end },
        status: { notIn: ["COMPLETED", "SKIPPED"] },
      },
      select: taskSelect,
      orderBy: { dueAt: "asc" },
      take: 5,
    }),
    prisma.task.count({
      where: { fieldId: field.id, dueAt: { lt: today.start }, status: { notIn: ["COMPLETED", "SKIPPED"] } },
    }),
    prisma.task.count({
      where: {
        fieldId: field.id,
        dueAt: { gt: today.end, lte: upcoming.end },
        status: { notIn: ["COMPLETED", "SKIPPED"] },
      },
    }),
    prisma.activity.findMany({
      where: { fieldId: field.id },
      include: {
        sector: { select: { name: true } },
        createdBy: { select: { name: true } },
        irrigationEvent: true,
      },
      orderBy: { occurredAt: "desc" },
      take: 5,
    }),
    prisma.fieldNote.findMany({
      where: { fieldId: field.id, deletedAt: null },
      include: { sector: { select: { name: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.expense.aggregate({ where: { fieldId: field.id, deletedAt: null }, _sum: { amount: true } }),
    prisma.budget.findFirst({
      where: { farmId: farm.id, OR: [{ cropCycleId: cycle.id }, { cropCycleId: null }] },
      orderBy: { createdAt: "desc" },
    }),
    prisma.inventoryItem.count({
      where: {
        farmId: farm.id,
        deletedAt: null,
        quantityOnHand: { lte: prisma.inventoryItem.fields.minimumThreshold },
      },
    }),
    prisma.issue.count({ where: { fieldId: field.id, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.issue.count({
      where: { fieldId: field.id, status: { in: ["OPEN", "IN_PROGRESS"] }, severity: "CRITICAL" },
    }),
    prisma.equipment.count({ where: { farmId: farm.id, nextMaintenance: { lte: upcoming.end } } }),
    prisma.irrigationEvent.findFirst({
      where: { sector: { fieldId: field.id } },
      include: { sector: { select: { id: true, name: true } } },
      orderBy: { startedAt: "desc" },
    }),
    prisma.task.findFirst({
      where: { fieldId: field.id, category: "Irrigation", status: { notIn: ["COMPLETED", "SKIPPED"] } },
      include: { sector: { select: { id: true, name: true } } },
      orderBy: { dueAt: "asc" },
    }),
    prisma.weatherSnapshot.findFirst({ where: { farmId: farm.id }, orderBy: { observedAt: "desc" } }),
  ]);
  const actual = decimal(expenseAgg._sum.amount) ?? 0;
  const planned = decimal(budget?.plannedAmount) ?? 0;
  const planting = cycle.actualPlantingDate ?? cycle.plannedPlantingDate;
  const daysSincePlanting = Math.max(0, Math.floor((Date.now() - planting.getTime()) / 864e5));
  const daysRemaining = cycle.expectedHarvestDate
    ? Math.max(0, Math.ceil((cycle.expectedHarvestDate.getTime() - Date.now()) / 864e5))
    : null;
  return {
    user: { ...user, role },
    farm: { ...farm, latitude: decimal(farm.latitude)!, longitude: decimal(farm.longitude)! },
    field: { ...field, areaHa: decimal(field.areaHa)! },
    cycle: {
      id: cycle.id,
      crop: cycle.crop.name,
      variety: cycle.variety,
      stage: cycle.growthStage?.name ?? "Not set",
      plantingDate: iso(planting)!,
      expectedHarvestDate: iso(cycle.expectedHarvestDate),
      daysSincePlanting,
      daysRemaining,
    },
    tasks: {
      today: todayTasks.map((t) => ({ ...t, dueAt: iso(t.dueAt)!, completedAt: iso(t.completedAt) })),
      overdueCount,
      upcomingCount,
    },
    recentActivities: recentActivities.map((a) => ({
      ...a,
      occurredAt: iso(a.occurredAt)!,
      quantity: decimal(a.quantity),
      cost: decimal(a.cost),
      irrigationEvent: a.irrigationEvent
        ? {
            ...a.irrigationEvent,
            startedAt: iso(a.irrigationEvent.startedAt)!,
            flowM3h: decimal(a.irrigationEvent.flowM3h)!,
            estimatedLiters: decimal(a.irrigationEvent.estimatedLiters)!,
            pressureBar: decimal(a.irrigationEvent.pressureBar),
            createdAt: iso(a.irrigationEvent.createdAt)!,
          }
        : null,
    })),
    recentNotes: recentNotes.map((n) => ({
      ...n,
      createdAt: iso(n.createdAt)!,
      updatedAt: iso(n.updatedAt)!,
      deletedAt: iso(n.deletedAt),
    })),
    budget: {
      actual,
      planned,
      remaining: planned - actual,
      percentUsed: planned ? (actual / planned) * 100 : 0,
      currency: farm.currency,
    },
    alerts: { lowStockCount, openIssues, criticalIssues, maintenanceDue },
    lastIrrigation: lastIrrigation
      ? {
          ...lastIrrigation,
          startedAt: iso(lastIrrigation.startedAt)!,
          flowM3h: decimal(lastIrrigation.flowM3h)!,
          estimatedLiters: decimal(lastIrrigation.estimatedLiters)!,
          pressureBar: decimal(lastIrrigation.pressureBar),
          createdAt: iso(lastIrrigation.createdAt)!,
        }
      : null,
    nextIrrigation: nextIrrigation ? { ...nextIrrigation, dueAt: iso(nextIrrigation.dueAt)! } : null,
    weather: weather
      ? {
          ...weather,
          observedAt: iso(weather.observedAt)!,
          temperatureC: decimal(weather.temperatureC),
          windKph: decimal(weather.windKph),
          precipitationMm: decimal(weather.precipitationMm),
          createdAt: iso(weather.createdAt)!,
        }
      : null,
  };
}

export async function getReports() {
  const [activities, irrigation, expenses, inventory, equipment, cycle, tasks] = await Promise.all([
    getActivities(100),
    getIrrigationEvents(100),
    getExpenseData(),
    getInventory(),
    getEquipment(),
    getActiveCropCycle(),
    getTasks("all"),
  ]);
  return { activities, irrigation, expenses, inventory, equipment, cycle, tasks };
}

export async function getGuidePageData() {
  const { farm, field, cycle } = await requireActiveCycle();
  const [guide, issues, tasks, weather, lastIrrigation] = await Promise.all([
    prisma.cropGuide.findFirst({
      where: { cropId: cycle.cropId },
      include: { articles: { orderBy: [{ category: "asc" }, { title: "asc" }] } },
    }),
    prisma.issue.findMany({
      where: { fieldId: field.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
      select: { category: true, severity: true, title: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.task.findMany({
      where: { fieldId: field.id, status: { notIn: ["COMPLETED", "SKIPPED"] } },
      select: { category: true, priority: true, name: true },
      orderBy: { dueAt: "asc" },
      take: 10,
    }),
    prisma.weatherSnapshot.findFirst({ where: { farmId: farm.id }, orderBy: { observedAt: "desc" } }),
    prisma.irrigationEvent.findFirst({
      where: { sector: { fieldId: field.id } },
      orderBy: { startedAt: "desc" },
    }),
  ]);
  const planting = cycle.actualPlantingDate ?? cycle.plannedPlantingDate;
  const stage = cycle.growthStage?.name ?? "Not set";
  const contextTerms = new Set([stage.toLowerCase()]);
  for (const row of [...issues, ...tasks]) contextTerms.add(row.category.toLowerCase());
  if (weather && (decimal(weather.precipitationMm) ?? 0) > 10) contextTerms.add("drainage");
  if (!lastIrrigation || Date.now() - lastIrrigation.startedAt.getTime() > 3 * 864e5)
    contextTerms.add("irrigation");
  const articles = (guide?.articles ?? [])
    .map((article) => {
      const haystack = `${article.stage ?? ""} ${article.category} ${article.title}`.toLowerCase();
      const score = [...contextTerms].reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
      return {
        ...article,
        lastReviewedAt: iso(article.lastReviewedAt),
        createdAt: iso(article.createdAt)!,
        updatedAt: iso(article.updatedAt)!,
        score,
      };
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return {
    guide: { id: guide?.id ?? null, title: guide?.title ?? `${cycle.crop.name} field guide` },
    crop: cycle.crop.name,
    stage,
    daysSincePlanting: Math.max(0, Math.floor((Date.now() - planting.getTime()) / 864e5)),
    articles,
    context: {
      openIssues: issues.length,
      openTasks: tasks.length,
      weatherObservedAt: iso(weather?.observedAt),
      lastIrrigationAt: iso(lastIrrigation?.startedAt),
    },
  };
}
