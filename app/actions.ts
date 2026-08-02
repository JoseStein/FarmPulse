"use server";

import { prisma } from "@/lib/prisma";
import {
  SafeActionError,
  requireActiveCycle,
  requireActiveField,
  requireFarmContext,
  requireRole,
  verifySector,
  SELECTED_FIELD_COOKIE,
} from "@/lib/data/context";
import { combineFarmDateTime } from "@/lib/data/dates";
import {
  activitySchema,
  budgetSchema,
  cropCycleSchema,
  equipmentSchema,
  expenseSchema,
  farmSettingsSchema,
  farmUserAccessSchema,
  farmUserCreateSchema,
  farmUserRemoveSchema,
  fieldNoteSchema,
  inventoryItemSchema,
  issueStatusSchema,
  passwordChangeSchema,
  maintenanceSchema,
  stockAdjustmentSchema,
  taskCreateSchema,
  taskStatusSchema,
} from "@/lib/validations";
import { Prisma, type ActivityType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { cookies } from "next/headers";

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string; fields?: Record<string, string[]> };

function failure(error: unknown): ActionResult<never> {
  if (error instanceof z.ZodError)
    return {
      ok: false,
      error: "Please correct the highlighted information.",
      fields: error.flatten().fieldErrors as Record<string, string[]>,
    };
  if (error instanceof SafeActionError) return { ok: false, error: error.message };
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    return { ok: false, error: "This request was already saved." };
  console.error("FarmPulse action failed", error);
  return { ok: false, error: "Something went wrong while saving. Please try again." };
}

const activityByCategory: Record<string, ActivityType | undefined> = {
  Irrigation: "IRRIGATION",
  Fertilization: "FERTILIZER_APPLICATION",
  "Pest inspection": "PEST_INSPECTION",
  "Disease inspection": "DISEASE_INSPECTION",
  "Weed control": "WEED_CONTROL",
  Maintenance: "EQUIPMENT_MAINTENANCE",
  Planting: "PLANTING",
  Harvest: "HARVEST",
};

function refreshOperationalPages() {
  for (const path of [
    "/dashboard",
    "/tasks",
    "/activities",
    "/irrigation",
    "/map",
    "/expenses",
    "/journal",
    "/reports",
    "/prepare",
  ])
    revalidatePath(path);
}

export async function selectFieldAction(fieldId: string): Promise<ActionResult<{ fieldId: string }>> {
  try {
    const parsedId = z.string().uuid().parse(fieldId);
    const context = await requireFarmContext();
    const field = await prisma.field.findFirst({
      where: { id: parsedId, farmId: context.farm.id, status: "ACTIVE", deletedAt: null },
      select: { id: true },
    });
    if (!field) throw new SafeActionError("NOT_FOUND", "That production lot is not available.");
    (await cookies()).set(SELECTED_FIELD_COOKIE, field.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    revalidatePath("/", "layout");
    return { ok: true, data: { fieldId: field.id } };
  } catch (error) {
    return failure(error);
  }
}

export async function createLandPreparationTasksAction(): Promise<ActionResult<{ createdCount: number }>> {
  try {
    const context = await requireActiveCycle();
    requireRole(context.role, ["ADMIN"]);
    const templates = [
      {
        name: "[Land setup] Walk the field and document current conditions",
        description: "Inspect boundaries, access, slope, visible wet areas, existing vegetation, and infrastructure. Record findings in the field journal; do not estimate measurements that are unknown.",
        category: "Land assessment",
        priority: "HIGH" as const,
        offsetDays: 1,
      },
      {
        name: "[Land setup] Inspect drainage and wet-weather access",
        description: "Walk the field after rain if safe. Identify standing water, runoff paths, erosion, blocked outlets, and access limitations.",
        category: "Drainage",
        priority: "HIGH" as const,
        offsetDays: 2,
      },
      {
        name: "[Land setup] Plan representative soil sampling",
        description: "Choose representative sampling locations and arrange a laboratory test before making fertilizer or lime decisions.",
        category: "Soil testing",
        priority: "HIGH" as const,
        offsetDays: 3,
      },
      {
        name: "[Land setup] Assess the water source and irrigation capacity",
        description: "Confirm the physical water source, seasonal reliability, pump condition, flow, pressure, filtration, and coverage. Record measured values only.",
        category: "Irrigation setup",
        priority: "HIGH" as const,
        offsetDays: 4,
      },
      {
        name: "[Land setup] Confirm crop variety and planting method",
        description: context.cycle.crop.name === "Crop not selected"
          ? "Select the intended crop, then confirm its variety, seed or planting-material format, row spacing, plant spacing, and supplier before calculating quantities."
          : `Confirm the ${context.cycle.crop.name} variety, seed or planting-material format, row spacing, plant spacing, and supplier before calculating quantities.`,
        category: "Crop planning",
        priority: "MEDIUM" as const,
        offsetDays: 5,
      },
      {
        name: "[Land setup] Identify required equipment and services",
        description: "List owned, rented, or contracted equipment needed for clearing, soil preparation, transport, irrigation, and planting.",
        category: "Equipment planning",
        priority: "MEDIUM" as const,
        offsetDays: 6,
      },
      {
        name: "[Land setup] Review readiness before setting the planting date",
        description: "Review soil results, drainage, water capacity, land preparation, planting-material availability, labor, equipment, and the weather window. Set a planting date only when the evidence supports it.",
        category: "Readiness review",
        priority: "HIGH" as const,
        offsetDays: 10,
      },
    ];
    const existing = await prisma.task.findMany({
      where: { cropCycleId: context.cycle.id, name: { in: templates.map((template) => template.name) } },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((task) => task.name));
    const missing = templates.filter((template) => !existingNames.has(template.name));
    if (missing.length === 0) return { ok: true, data: { createdCount: 0 } };
    await prisma.$transaction(async (tx) => {
      const createdIds: string[] = [];
      for (const template of missing) {
        const dueDate = formatInTimeZone(addDays(new Date(), template.offsetDays), context.farm.timezone, "yyyy-MM-dd");
        const task = await tx.task.create({
          data: {
            fieldId: context.field.id,
            cropCycleId: context.cycle.id,
            name: template.name,
            description: template.description,
            category: template.category,
            priority: template.priority,
            dueAt: combineFarmDateTime(dueDate, "08:00", context.farm.timezone),
          },
        });
        createdIds.push(task.id);
      }
      await tx.auditLog.create({
        data: {
          farmId: context.farm.id,
          userId: context.user.id,
          action: "GENERATE_LAND_PREPARATION_TASKS",
          entityType: "CropCycle",
          entityId: context.cycle.id,
          metadata: { createdCount: createdIds.length, taskIds: createdIds },
        },
      });
    });
    refreshOperationalPages();
    return { ok: true, data: { createdCount: missing.length } };
  } catch (error) {
    return failure(error);
  }
}

export async function updateTaskStatusAction(
  input: unknown,
): Promise<ActionResult<{ taskId: string; activityId: string | null }>> {
  try {
    const data = taskStatusSchema.parse(input);
    const context = await requireActiveCycle();
    const task = await prisma.task.findFirst({ where: { id: data.taskId, fieldId: context.field.id } });
    if (!task) throw new SafeActionError("NOT_FOUND", "Task not found.");
    if (["COMPLETED", "SKIPPED"].includes(task.status) && data.status === task.status)
      return { ok: true, data: { taskId: task.id, activityId: null } };
    const shouldCreate =
      data.status === "COMPLETED" && (data.createActivity || Boolean(activityByCategory[task.category]));
    const result = await prisma.$transaction(async (tx) => {
      let activityId: string | null = null;
      if (shouldCreate) {
        const activity = await tx.activity.create({
          data: {
            fieldId: task.fieldId,
            sectorId: task.sectorId,
            cropCycleId: task.cropCycleId ?? context.cycle.id,
            createdById: context.user.id,
            type: activityByCategory[task.category] ?? "OTHER",
            occurredAt: new Date(),
            worker: context.user.name,
            notes: data.completionNotes || `Completed task: ${task.name}`,
            completedTaskId: task.id,
          },
        });
        activityId = activity.id;
      }
      await tx.task.update({
        where: { id: task.id },
        data: {
          status: data.status,
          completionNotes: data.status === "IN_PROGRESS" ? null : data.completionNotes,
          completedAt: data.status === "IN_PROGRESS" ? null : new Date(),
          completedById: data.status === "IN_PROGRESS" ? null : context.user.id,
        },
      });
      await tx.auditLog.create({
        data: {
          farmId: context.farm.id,
          userId: context.user.id,
          action: `TASK_${data.status}`,
          entityType: "Task",
          entityId: task.id,
          metadata: { activityId },
        },
      });
      return { taskId: task.id, activityId };
    });
    refreshOperationalPages();
    return { ok: true, data: result };
  } catch (error) {
    return failure(error);
  }
}

export async function createTaskAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const data = taskCreateSchema.parse(input);
    const context = await requireActiveCycle();
    requireRole(context.role, ["ADMIN"]);
    await verifySector(context.field.id, data.sectorId || null);
    if (data.assignedUserId) {
      const member = await prisma.farmMembership.findFirst({
        where: { farmId: context.farm.id, userId: data.assignedUserId },
      });
      if (!member) throw new SafeActionError("NOT_FOUND", "Assigned user is not a farm member.");
    }
    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          fieldId: context.field.id,
          sectorId: data.sectorId || null,
          cropCycleId: context.cycle.id,
          assignedUserId: data.assignedUserId || null,
          name: data.name,
          description: data.description,
          category: data.category,
          priority: data.priority,
          dueAt: combineFarmDateTime(data.dueDate, data.dueTime, context.farm.timezone),
        },
      });
      await tx.auditLog.create({
        data: {
          farmId: context.farm.id,
          userId: context.user.id,
          action: "CREATE",
          entityType: "Task",
          entityId: created.id,
        },
      });
      return created;
    });
    refreshOperationalPages();
    return { ok: true, data: { id: task.id } };
  } catch (error) {
    return failure(error);
  }
}

export async function createActivityAction(
  input: unknown,
): Promise<ActionResult<{ id: string; irrigationEventId: string | null; estimatedLiters: number | null }>> {
  try {
    const data = activitySchema.parse(input);
    const context = await requireActiveCycle();
    if (data.cropCycleId && data.cropCycleId !== context.cycle.id)
      throw new SafeActionError("VALIDATION", "The selected crop cycle is no longer active.");
    const sector = await verifySector(context.field.id, data.sectorId || null);
    if (data.type === "IRRIGATION" && !sector)
      throw new SafeActionError("VALIDATION", "Choose a sector for irrigation.");
    if (data.taskId) {
      const task = await prisma.task.findFirst({ where: { id: data.taskId, fieldId: context.field.id } });
      if (!task) throw new SafeActionError("NOT_FOUND", "Related task not found.");
    }
    let flowM3h = data.flowM3h;
    const design = await prisma.appSetting.findUnique({
      where: { farmId_key: { farmId: context.farm.id, key: "irrigation_design" } },
    });
    if (data.type === "IRRIGATION" && !flowM3h) {
      const configuredFlow = Number((design?.value as Record<string, unknown> | null)?.sectorFlowM3h);
      if (Number.isFinite(configuredFlow) && configuredFlow > 0) flowM3h = configuredFlow;
    }
    if (data.type === "IRRIGATION" && !flowM3h)
      throw new SafeActionError("VALIDATION", "Enter a measured flow rate; the planned design has not been field verified.");
    const duration =
      data.durationMinutes ??
      (data.startTime && data.endTime
        ? Math.round(
            (combineFarmDateTime(data.date, data.endTime, context.farm.timezone).getTime() -
              combineFarmDateTime(data.date, data.startTime, context.farm.timezone).getTime()) /
              60000,
          )
        : undefined);
    if (data.type === "IRRIGATION" && (!duration || duration <= 0))
      throw new SafeActionError("VALIDATION", "Irrigation duration must be greater than zero.");
    const estimatedLiters =
      data.type === "IRRIGATION" ? Number((((flowM3h! * duration!) / 60) * 1000).toFixed(2)) : null;
    const occurredAt = combineFarmDateTime(data.date, data.startTime || "12:00", context.farm.timezone);
    const weather = await prisma.weatherSnapshot.findFirst({
      where: { farmId: context.farm.id },
      orderBy: { observedAt: "desc" },
    });
    const inventoryItem = data.inventoryItemId
      ? await prisma.inventoryItem.findFirst({
          where: { id: data.inventoryItemId, farmId: context.farm.id, deletedAt: null },
        })
      : null;
    if (data.inventoryItemId && !inventoryItem)
      throw new SafeActionError("NOT_FOUND", "Inventory item not found.");
    if (inventoryItem && !data.inventoryQuantity)
      throw new SafeActionError("VALIDATION", "Enter the inventory quantity used.");
    if (
      inventoryItem &&
      data.inventoryQuantity &&
      Number(inventoryItem.quantityOnHand) < data.inventoryQuantity &&
      !(context.role === "ADMIN" && data.allowNegativeStock)
    )
      throw new SafeActionError(
        "VALIDATION",
        `Only ${inventoryItem.quantityOnHand.toString()} ${inventoryItem.unit} is available.`,
      );
    const result = await prisma.$transaction(async (tx) => {
      let plantingCrop: { id: string; name: string } | null = null;
      let plantingStageId: string | null = null;
      if (data.type === "PLANTING") {
        if (data.plantingCropId) {
          plantingCrop = await tx.crop.findUnique({
            where: { id: data.plantingCropId },
            select: { id: true, name: true },
          });
          if (!plantingCrop) throw new SafeActionError("NOT_FOUND", "The selected crop was not found.");
        } else if (data.plantingCropName) {
          plantingCrop = await tx.crop.findFirst({
            where: { name: { equals: data.plantingCropName, mode: "insensitive" } },
            select: { id: true, name: true },
          });
          if (!plantingCrop) {
            plantingCrop = await tx.crop.create({
              data: { name: data.plantingCropName },
              select: { id: true, name: true },
            });
            const universalStages = [
              "Planning",
              "Land preparation",
              "Planting",
              "Establishment",
              "Growth",
              "Harvest",
              "Completed",
            ];
            await tx.growthStage.createMany({
              data: universalStages.map((name, order) => ({ cropId: plantingCrop!.id, name, order })),
            });
          }
        }
        if (!plantingCrop)
          throw new SafeActionError("VALIDATION", "Choose the crop being planted.");
        let plantingStage = await tx.growthStage.findFirst({
          where: { cropId: plantingCrop.id, name: "Planting" },
          select: { id: true },
        });
        if (!plantingStage) {
          const lastStage = await tx.growthStage.findFirst({
            where: { cropId: plantingCrop.id },
            orderBy: { order: "desc" },
            select: { order: true },
          });
          plantingStage = await tx.growthStage.create({
            data: { cropId: plantingCrop.id, name: "Planting", order: (lastStage?.order ?? -1) + 1 },
            select: { id: true },
          });
        }
        plantingStageId = plantingStage.id;
        const cropChanged = plantingCrop.id !== context.cycle.cropId;
        await tx.cropCycle.update({
          where: { id: context.cycle.id },
          data: {
            cropId: plantingCrop.id,
            growthStageId: plantingStageId,
            actualPlantingDate: occurredAt,
            seedQuantityKg:
              data.quantity && data.unit === "kg"
                ? data.quantity
                : data.quantity && data.unit === "g"
                  ? data.quantity / 1000
                  : null,
            ...(data.plantingVariety
              ? { variety: data.plantingVariety }
              : cropChanged
                ? { variety: null }
                : {}),
            ...(cropChanged
              ? {
                  expectedHarvestDate: null,
                  actualHarvestDate: null,
                  seedQuantityKg: null,
                  populationTarget: null,
                  expectedYieldKg: null,
                  actualYieldKg: null,
                }
              : {}),
          },
        });
      }
      const activity = await tx.activity.create({
        data: {
          fieldId: context.field.id,
          sectorId: sector?.id,
          cropCycleId: context.cycle.id,
          createdById: context.user.id,
          type: data.type,
          occurredAt,
          startTime: data.startTime ? occurredAt : null,
          endTime: data.endTime
            ? combineFarmDateTime(data.date, data.endTime, context.farm.timezone)
            : duration
              ? new Date(occurredAt.getTime() + duration * 60000)
              : null,
          quantity: data.quantity ?? estimatedLiters,
          unit: data.unit ?? (estimatedLiters ? "liter" : null),
          productUsed: data.productUsed,
          worker: data.worker || context.user.name,
          cost: data.cost,
          notes: data.notes,
          completedTaskId: data.taskId,
          weatherSnapshotId: weather?.id,
          idempotencyKey: data.idempotencyKey,
        },
      });
      if (inventoryItem && data.inventoryQuantity) {
        await tx.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: { quantityOnHand: { decrement: data.inventoryQuantity } },
        });
        await tx.inventoryTransaction.create({
          data: {
            itemId: inventoryItem.id,
            quantity: -data.inventoryQuantity,
            type: "USAGE",
            reason: `Used in ${data.type.toLowerCase().replaceAll("_", " ")}`,
            activityId: activity.id,
          },
        });
      }
      let irrigationEventId: string | null = null;
      if (data.type === "IRRIGATION" && sector && duration && estimatedLiters != null) {
        const event = await tx.irrigationEvent.create({
          data: {
            sectorId: sector.id,
            activityId: activity.id,
            startedAt: occurredAt,
            durationMinutes: duration,
            flowM3h: flowM3h!,
            estimatedLiters,
            pressureBar: data.pressureBar,
            pumpRuntimeMinutes: duration,
            operator: data.worker || context.user.name,
            notes: data.notes,
          },
        });
        irrigationEventId = event.id;
      }
      if (data.taskId)
        await tx.task.update({
          where: { id: data.taskId },
          data: {
            status: "COMPLETED",
            completionNotes: data.notes,
            completedAt: new Date(),
            completedById: context.user.id,
          },
        });
      await tx.auditLog.create({
        data: {
          farmId: context.farm.id,
          userId: context.user.id,
          action: "CREATE",
          entityType: "Activity",
          entityId: activity.id,
          metadata: {
            type: data.type,
            irrigationEventId,
            ...(plantingCrop
              ? {
                  fromCropId: context.cycle.cropId,
                  plantedCropId: plantingCrop.id,
                  plantedCropName: plantingCrop.name,
                  plantingStageId,
                }
              : {}),
          },
        },
      });
      return { id: activity.id, irrigationEventId };
    });
    refreshOperationalPages();
    return { ok: true, data: { ...result, estimatedLiters } };
  } catch (error) {
    return failure(error);
  }
}

export async function createExpenseAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const data = expenseSchema.parse(input);
    const context = await requireActiveCycle();
    requireRole(context.role, ["ADMIN"]);
    const sector = await verifySector(context.field.id, data.sectorId || null);
    if(data.id){const existing=await prisma.expense.findFirst({where:{id:data.id,fieldId:context.field.id,deletedAt:null}});if(!existing)throw new SafeActionError("NOT_FOUND","Expense not found.");}
    const expense = await prisma.$transaction(async (tx) => {
      const values = {
          fieldId: context.field.id,
          sectorId: sector?.id,
          cropCycleId: context.cycle.id,
          enteredById: context.user.id,
          date: combineFarmDateTime(data.date, "12:00", context.farm.timezone),
          vendor: data.vendor,
          description: data.description,
          category: data.category,
          amount: new Prisma.Decimal(data.amount.toFixed(2)),
          currency: context.farm.currency,
          quantity: data.quantity,
          unitCost: data.unitCost,
          notes: data.notes,
          idempotencyKey: data.idempotencyKey,
        };
      const created = data.id?await tx.expense.update({where:{id:data.id},data:{...values,idempotencyKey:undefined}}):await tx.expense.create({data:values});
      await tx.auditLog.create({
        data: {
          farmId: context.farm.id,
          userId: context.user.id,
          action: data.id?"UPDATE":"CREATE",
          entityType: "Expense",
          entityId: created.id,
        },
      });
      return created;
    });
    refreshOperationalPages();
    return { ok: true, data: { id: expense.id } };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteExpenseAction(expenseId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const id = z.string().uuid().parse(expenseId);
    const context = await requireActiveField();
    requireRole(context.role, ["ADMIN"]);
    const row = await prisma.expense.findFirst({ where: { id, fieldId: context.field.id, deletedAt: null } });
    if (!row) throw new SafeActionError("NOT_FOUND", "Expense not found.");
    await prisma.$transaction([
      prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } }),
      prisma.auditLog.create({
        data: {
          farmId: context.farm.id,
          userId: context.user.id,
          action: "DELETE",
          entityType: "Expense",
          entityId: id,
        },
      }),
    ]);
    refreshOperationalPages();
    return { ok: true, data: { id } };
  } catch (error) {
    return failure(error);
  }
}

export async function saveBudgetAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const data = budgetSchema.parse(input);
    const context = await requireActiveCycle();
    requireRole(context.role, ["ADMIN"]);
    const existing = await prisma.budget.findFirst({
      where: { farmId: context.farm.id, cropCycleId: context.cycle.id },
      orderBy: { createdAt: "desc" },
    });
    const budget = await prisma.$transaction(async (tx) => {
      const saved = existing
        ? await tx.budget.update({
            where: { id: existing.id },
            data: {
              name: data.name,
              plannedAmount: new Prisma.Decimal(data.plannedAmount.toFixed(2)),
              currency: context.farm.currency,
            },
          })
        : await tx.budget.create({
            data: {
              farmId: context.farm.id,
              cropCycleId: context.cycle.id,
              name: data.name,
              plannedAmount: new Prisma.Decimal(data.plannedAmount.toFixed(2)),
              currency: context.farm.currency,
            },
          });
      await tx.auditLog.create({
        data: {
          farmId: context.farm.id,
          userId: context.user.id,
          action: existing ? "UPDATE" : "CREATE",
          entityType: "Budget",
          entityId: saved.id,
          metadata: {
            cropCycleId: context.cycle.id,
            fieldId: context.field.id,
            plannedAmount: data.plannedAmount,
            currency: context.farm.currency,
          },
        },
      });
      return saved;
    });
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { ok: true, data: { id: budget.id } };
  } catch (error) {
    return failure(error);
  }
}

export async function createFieldNoteAction(
  input: unknown,
): Promise<ActionResult<{ id: string; issueId: string | null; taskId: string | null }>> {
  try {
    const data = fieldNoteSchema.parse(input);
    const context = await requireActiveCycle();
    const sector = await verifySector(context.field.id, data.sectorId || null);
    if (data.assignedUserId) {
      const member = await prisma.farmMembership.findFirst({
        where: { farmId: context.farm.id, userId: data.assignedUserId },
      });
      if (!member) throw new SafeActionError("NOT_FOUND", "Assigned user is not a farm member.");
    }
    const result = await prisma.$transaction(async (tx) => {
      const note = await tx.fieldNote.create({
        data: {
          fieldId: context.field.id,
          sectorId: sector?.id,
          cropCycleId: context.cycle.id,
          createdById: context.user.id,
          category: data.category,
          body: data.body,
          isIssue: data.isIssue,
          idempotencyKey: data.idempotencyKey,
        },
      });
      let taskId: string | null = null;
      if (data.isIssue && data.createFollowUpTask) {
        const task = await tx.task.create({
          data: {
            fieldId: context.field.id,
            sectorId: sector?.id,
            cropCycleId: context.cycle.id,
            assignedUserId: data.assignedUserId || null,
            name: data.issueTitle || `Follow up: ${data.category}`,
            description: data.body,
            category: data.category.includes("Irrigation") ? "Maintenance" : data.category,
            priority: data.severity ?? "MEDIUM",
            dueAt: new Date(Date.now() + 864e5),
          },
        });
        taskId = task.id;
      }
      let issueId: string | null = null;
      if (data.isIssue) {
        const issue = await tx.issue.create({
          data: {
            fieldId: context.field.id,
            sectorId: sector?.id,
            fieldNoteId: note.id,
            assignedUserId: data.assignedUserId || null,
            followUpTaskId: taskId,
            title: data.issueTitle || data.category,
            category: data.category,
            severity: data.severity ?? "MEDIUM",
            description: data.body,
          },
        });
        issueId = issue.id;
      }
      await tx.auditLog.create({
        data: {
          farmId: context.farm.id,
          userId: context.user.id,
          action: "CREATE",
          entityType: data.isIssue ? "FieldNote+Issue" : "FieldNote",
          entityId: note.id,
          metadata: { issueId, taskId },
        },
      });
      return { id: note.id, issueId, taskId };
    });
    refreshOperationalPages();
    return { ok: true, data: result };
  } catch (error) {
    return failure(error);
  }
}

export async function updateIssueStatusAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const data = issueStatusSchema.parse(input);
    const context = await requireActiveField();
    const issue = await prisma.issue.findFirst({ where: { id: data.issueId, fieldId: context.field.id } });
    if (!issue) throw new SafeActionError("NOT_FOUND", "Issue not found.");
    const resolved = ["RESOLVED", "CLOSED"].includes(data.status);
    await prisma.$transaction([
      prisma.issue.update({
        where: { id: issue.id },
        data: {
          status: data.status,
          resolutionNotes: data.resolutionNotes,
          resolvedAt: resolved ? new Date() : null,
          resolvedById: resolved ? context.user.id : null,
        },
      }),
      prisma.auditLog.create({
        data: {
          farmId: context.farm.id,
          userId: context.user.id,
          action: `ISSUE_${data.status}`,
          entityType: "Issue",
          entityId: issue.id,
        },
      }),
    ]);
    refreshOperationalPages();
    return { ok: true, data: { id: issue.id } };
  } catch (error) {
    return failure(error);
  }
}

export async function saveInventoryItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const data = inventoryItemSchema.parse(input);
    const context = await requireFarmContext();
    requireRole(context.role, ["ADMIN"]);
    let id: string;
    if (data.id) {
      const existing = await prisma.inventoryItem.findFirst({
        where: { id: data.id, farmId: context.farm.id, deletedAt: null },
      });
      if (!existing) throw new SafeActionError("NOT_FOUND", "Inventory item not found.");
      id = (
        await prisma.inventoryItem.update({
          where: { id: data.id },
          data: {
            ...data,
            id: undefined,
            expirationDate: data.expirationDate ? new Date(`${data.expirationDate}T12:00:00Z`) : null,
          },
        })
      ).id;
    } else
      id = (
        await prisma.inventoryItem.create({
          data: {
            farmId: context.farm.id,
            name: data.name,
            category: data.category,
            quantityOnHand: data.quantityOnHand,
            unit: data.unit,
            minimumThreshold: data.minimumThreshold,
            unitCost: data.unitCost,
            supplier: data.supplier,
            storageLocation: data.storageLocation,
            expirationDate: data.expirationDate ? new Date(`${data.expirationDate}T12:00:00Z`) : null,
            notes: data.notes,
          },
        })
      ).id;
    await prisma.auditLog.create({
      data: {
        farmId: context.farm.id,
        userId: context.user.id,
        action: data.id ? "UPDATE" : "CREATE",
        entityType: "InventoryItem",
        entityId: id,
      },
    });
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true, data: { id } };
  } catch (error) {
    return failure(error);
  }
}

export async function adjustStockAction(
  input: unknown,
): Promise<ActionResult<{ id: string; quantityOnHand: number }>> {
  try {
    const data = stockAdjustmentSchema.parse(input);
    const context = await requireFarmContext();
    const item = await prisma.inventoryItem.findFirst({
      where: { id: data.itemId, farmId: context.farm.id, deletedAt: null },
    });
    if (!item) throw new SafeActionError("NOT_FOUND", "Inventory item not found.");
    const next = Number(item.quantityOnHand) + data.quantity;
    if (next < 0 && context.role !== "ADMIN")
      throw new SafeActionError("VALIDATION", "This adjustment would make stock negative.");
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({
        where: { id: item.id },
        data: { quantityOnHand: next },
      });
      const transaction = await tx.inventoryTransaction.create({
        data: {
          itemId: item.id,
          quantity: data.quantity,
          type: data.quantity > 0 ? "ADJUSTMENT_IN" : "USAGE",
          reason: data.reason,
        },
      });
      await tx.auditLog.create({
        data: {
          farmId: context.farm.id,
          userId: context.user.id,
          action: "STOCK_ADJUSTMENT",
          entityType: "InventoryItem",
          entityId: item.id,
          metadata: { quantity: data.quantity, transactionId: transaction.id },
        },
      });
      return updated;
    });
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: result.id, quantityOnHand: Number(result.quantityOnHand) } };
  } catch (error) {
    return failure(error);
  }
}

export async function saveEquipmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const data = equipmentSchema.parse(input);
    const context = await requireFarmContext();
    requireRole(context.role, ["ADMIN"]);
    let id: string;
    const values = {
      name: data.name,
      type: data.type,
      status: data.status,
      manufacturer: data.manufacturer,
      model: data.model,
      runtimeHours: data.runtimeHours,
      nextMaintenance: data.nextMaintenance ? new Date(`${data.nextMaintenance}T12:00:00Z`) : null,
      notes: data.notes,
    };
    if (data.id) {
      const existing = await prisma.equipment.findFirst({ where: { id: data.id, farmId: context.farm.id } });
      if (!existing) throw new SafeActionError("NOT_FOUND", "Equipment not found.");
      id = (await prisma.equipment.update({ where: { id: data.id }, data: values })).id;
    } else id = (await prisma.equipment.create({ data: { ...values, farmId: context.farm.id } })).id;
    await prisma.auditLog.create({
      data: {
        farmId: context.farm.id,
        userId: context.user.id,
        action: data.id ? "UPDATE" : "CREATE",
        entityType: "Equipment",
        entityId: id,
      },
    });
    revalidatePath("/equipment");
    revalidatePath("/dashboard");
    return { ok: true, data: { id } };
  } catch (error) {
    return failure(error);
  }
}

export async function addMaintenanceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const data = maintenanceSchema.parse(input);
    const context = await requireActiveField();
    const equipment = await prisma.equipment.findFirst({
      where: { id: data.equipmentId, farmId: context.farm.id },
    });
    if (!equipment) throw new SafeActionError("NOT_FOUND", "Equipment not found.");
    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.maintenanceRecord.create({
        data: {
          equipmentId: equipment.id,
          performedAt: new Date(`${data.performedAt}T12:00:00Z`),
          description: data.description,
          cost: data.cost,
          runtimeHours: data.runtimeHours,
          notes: data.notes,
        },
      });
      await tx.equipment.update({
        where: { id: equipment.id },
        data: {
          lastMaintenance: record.performedAt,
          nextMaintenance: data.nextMaintenance ? new Date(`${data.nextMaintenance}T12:00:00Z`) : null,
          runtimeHours: data.runtimeHours ?? equipment.runtimeHours,
        },
      });
      await tx.activity.create({
        data: {
          fieldId: context.field.id,
          createdById: context.user.id,
          type: "EQUIPMENT_MAINTENANCE",
          occurredAt: record.performedAt,
          worker: context.user.name,
          cost: data.cost,
          notes: `${equipment.name}: ${data.description}`,
        },
      });
      await tx.auditLog.create({
        data: {
          farmId: context.farm.id,
          userId: context.user.id,
          action: "MAINTENANCE_COMPLETE",
          entityType: "Equipment",
          entityId: equipment.id,
          metadata: { recordId: record.id },
        },
      });
      return record;
    });
    revalidatePath("/equipment");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: result.id } };
  } catch (error) {
    return failure(error);
  }
}

export async function updateCropCycleAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const data = cropCycleSchema.parse(input);
    const context = await requireActiveCycle();
    requireRole(context.role, ["ADMIN"]);
    const beforeStage = context.cycle.growthStageId;
    const beforeCrop = context.cycle.cropId;
    const updated = await prisma.$transaction(async (tx) => {
      let targetCrop = await tx.crop.findUnique({ where: { id: context.cycle.cropId } });
      let newCropCreated = false;
      if (data.planningCropId) targetCrop = await tx.crop.findUnique({ where: { id: data.planningCropId } });
      else if (data.planningCropName) {
        targetCrop = await tx.crop.findFirst({ where: { name: { equals: data.planningCropName, mode: "insensitive" } } });
        if (!targetCrop) {
          targetCrop = await tx.crop.create({ data: { name: data.planningCropName } });
          newCropCreated = true;
        }
      }
      if (!targetCrop) throw new SafeActionError("NOT_FOUND", "The selected crop was not found.");
      if (newCropCreated) {
        const stages = ["Planning", "Land preparation", "Planting", "Establishment", "Growth", "Harvest", "Completed"];
        await tx.growthStage.createMany({ data: stages.map((name, order) => ({ cropId: targetCrop!.id, name, order })) });
      }
      const cropChanged = targetCrop.id !== context.cycle.cropId;
      let growthStageId = data.growthStageId || null;
      if (cropChanged) {
        let planning = await tx.growthStage.findFirst({ where: { cropId: targetCrop.id, name: "Planning" } });
        if (!planning) planning = await tx.growthStage.create({ data: { cropId: targetCrop.id, name: "Planning", order: 0 } });
        growthStageId = planning.id;
      } else if (growthStageId) {
        const stage = await tx.growthStage.findFirst({ where: { id: growthStageId, cropId: targetCrop.id } });
        if (!stage) throw new SafeActionError("NOT_FOUND", "Growth stage not found.");
      }
      const row = await tx.cropCycle.update({
        where: { id: context.cycle.id },
        data: {
          cropId: targetCrop.id,
          variety: data.variety || null,
          actualPlantingDate: data.actualPlantingDate
            ? new Date(`${data.actualPlantingDate}T12:00:00Z`)
            : null,
          expectedHarvestDate: data.expectedHarvestDate
            ? new Date(`${data.expectedHarvestDate}T12:00:00Z`)
            : null,
          growthStageId,
          populationTarget: data.populationTarget,
          expectedYieldKg: data.expectedYieldKg,
          actualHarvestDate: data.actualHarvestDate
            ? new Date(`${data.actualHarvestDate}T12:00:00Z`)
            : null,
          actualYieldKg: data.actualYieldKg,
          status: data.status,
        },
      });
      await tx.auditLog.create({
        data: {
          farmId: context.farm.id,
          userId: context.user.id,
          action: beforeStage !== row.growthStageId ? "GROWTH_STAGE_CHANGE" : "UPDATE",
          entityType: "CropCycle",
          entityId: row.id,
          metadata: { fromStageId: beforeStage, toStageId: row.growthStageId, fromCropId: beforeCrop, toCropId: row.cropId },
        },
      });
      return row;
    });
    revalidatePath("/crop-cycle");
    revalidatePath("/dashboard");
    revalidatePath("/guide");
    return { ok: true, data: { id: updated.id } };
  } catch (error) {
    return failure(error);
  }
}

export async function updateFarmSettingsAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const data = farmSettingsSchema.parse(input);
    const context = await requireFarmContext();
    requireRole(context.role, ["ADMIN"]);
    const farm = await prisma.$transaction(async (tx) => {
      const row = await tx.farm.update({ where: { id: context.farm.id }, data });
      await tx.auditLog.create({
        data: {
          farmId: row.id,
          userId: context.user.id,
          action: "UPDATE",
          entityType: "Farm",
          entityId: row.id,
        },
      });
      return row;
    });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/map");
    return { ok: true, data: { id: farm.id } };
  } catch (error) {
    return failure(error);
  }
}

export async function createFarmUserAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const data = farmUserCreateSchema.parse(input);
    const context = await requireFarmContext();
    requireRole(context.role, ["ADMIN"]);
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true, active: true, memberships: { where: { farmId: context.farm.id }, select: { id: true } } },
    });
    if (existing?.memberships.length)
      throw new SafeActionError("VALIDATION", "A user with this email address already belongs to the farm.");
    if (existing?.active)
      throw new SafeActionError("VALIDATION", "This email address belongs to another active account.");
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const created = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: { name: data.name, passwordHash, role: data.role, active: true },
          })
        : await tx.user.create({
            data: { name: data.name, email: data.email, passwordHash, role: data.role },
          });
      await tx.farmMembership.create({
        data: { farmId: context.farm.id, userId: created.id, role: data.role },
      });
      await tx.auditLog.create({
        data: {
          farmId: context.farm.id,
          userId: context.user.id,
          action: existing ? "USER_RESTORE" : "USER_CREATE",
          entityType: "User",
          entityId: created.id,
          metadata: { email: created.email, role: data.role },
        },
      });
      return created;
    });
    revalidatePath("/settings");
    return { ok: true, data: { id: user.id } };
  } catch (error) {
    return failure(error);
  }
}

export async function removeInactiveFarmUserAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const data = farmUserRemoveSchema.parse(input);
    const context = await requireFarmContext();
    requireRole(context.role, ["ADMIN"]);
    if (data.userId === context.user.id)
      throw new SafeActionError("VALIDATION", "You cannot remove your own account.");
    const membership = await prisma.farmMembership.findUnique({
      where: { farmId_userId: { farmId: context.farm.id, userId: data.userId } },
      include: { user: { select: { email: true, active: true } } },
    });
    if (!membership) throw new SafeActionError("NOT_FOUND", "Farm user not found.");
    if (membership.user.active)
      throw new SafeActionError("VALIDATION", "Deactivate this user before removing them.");
    await prisma.$transaction(async (tx) => {
      await tx.farmMembership.delete({ where: { id: membership.id } });
      await tx.auditLog.create({
        data: {
          farmId: context.farm.id,
          userId: context.user.id,
          action: "USER_REMOVE",
          entityType: "User",
          entityId: data.userId,
          metadata: { email: membership.user.email },
        },
      });
    });
    revalidatePath("/settings");
    return { ok: true, data: { id: data.userId } };
  } catch (error) {
    return failure(error);
  }
}

export async function updateFarmUserAccessAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const data = farmUserAccessSchema.parse(input);
    const context = await requireFarmContext();
    requireRole(context.role, ["ADMIN"]);
    if (data.userId === context.user.id)
      throw new SafeActionError("VALIDATION", "You cannot change your own role or deactivate your own account.");
    const membership = await prisma.farmMembership.findUnique({
      where: { farmId_userId: { farmId: context.farm.id, userId: data.userId } },
      include: { user: { select: { email: true } } },
    });
    if (!membership) throw new SafeActionError("NOT_FOUND", "Farm user not found.");
    await prisma.$transaction(async (tx) => {
      await tx.farmMembership.update({ where: { id: membership.id }, data: { role: data.role } });
      await tx.user.update({ where: { id: data.userId }, data: { role: data.role, active: data.active } });
      await tx.auditLog.create({
        data: {
          farmId: context.farm.id,
          userId: context.user.id,
          action: "USER_ACCESS_UPDATE",
          entityType: "User",
          entityId: data.userId,
          metadata: { email: membership.user.email, role: data.role, active: data.active },
        },
      });
    });
    revalidatePath("/settings");
    return { ok: true, data: { id: data.userId } };
  } catch (error) {
    return failure(error);
  }
}

export async function changeOwnPasswordAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const data = passwordChangeSchema.parse(input);
    const context = await requireFarmContext();
    const user = await prisma.user.findUnique({
      where: { id: context.user.id },
      select: { id: true, passwordHash: true },
    });
    if (!user || !(await bcrypt.compare(data.currentPassword, user.passwordHash)))
      throw new SafeActionError("VALIDATION", "Your current password is incorrect.");
    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await tx.auditLog.create({
        data: {
          farmId: context.farm.id,
          userId: user.id,
          action: "PASSWORD_CHANGE",
          entityType: "User",
          entityId: user.id,
        },
      });
    });
    return { ok: true, data: { id: user.id } };
  } catch (error) {
    return failure(error);
  }
}

export async function getActivityDefaultsAction(): Promise<
  ActionResult<{
    fieldId: string;
    cropCycleId: string;
    timezone: string;
    sectors: Array<{ id: string; name: string; flowM3h: number | null }>;
  }>
> {
  try {
    const context = await requireActiveCycle();
    const [sectors, setting] = await Promise.all([
      prisma.sector.findMany({
        where: { fieldId: context.field.id },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.appSetting.findUnique({
        where: { farmId_key: { farmId: context.farm.id, key: "irrigation_design" } },
      }),
    ]);
    const configuredFlow = Number((setting?.value as Record<string, unknown> | null)?.sectorFlowM3h);
    const flowM3h = Number.isFinite(configuredFlow) && configuredFlow > 0 ? configuredFlow : null;
    return {
      ok: true,
      data: {
        fieldId: context.field.id,
        cropCycleId: context.cycle.id,
        timezone: context.farm.timezone,
        sectors: sectors.map((s) => ({ ...s, flowM3h })),
      },
    };
  } catch (error) {
    return failure(error);
  }
}
