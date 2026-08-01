"use server";

import { prisma } from "@/lib/prisma";
import {
  SafeActionError,
  requireActiveCycle,
  requireActiveField,
  requireFarmContext,
  requireRole,
  verifySector,
} from "@/lib/data/context";
import { combineFarmDateTime } from "@/lib/data/dates";
import {
  activitySchema,
  cropCycleSchema,
  equipmentSchema,
  expenseSchema,
  farmSettingsSchema,
  farmUserAccessSchema,
  farmUserCreateSchema,
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
  ])
    revalidatePath(path);
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
    if (data.type === "IRRIGATION" && !flowM3h)
      flowM3h = Number((design?.value as Record<string, unknown> | null)?.sectorFlowM3h ?? 11);
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
      const activity = await tx.activity.create({
        data: {
          fieldId: context.field.id,
          sectorId: sector?.id,
          cropCycleId: data.cropCycleId ?? context.cycle.id,
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
          metadata: { type: data.type, irrigationEventId },
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
    const context = await requireFarmContext();
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
          fieldId: (
            await tx.field.findFirstOrThrow({
              where: { farmId: context.farm.id, status: "ACTIVE", deletedAt: null },
            })
          ).id,
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
    if (data.growthStageId) {
      const stage = await prisma.growthStage.findFirst({
        where: { id: data.growthStageId, cropId: context.cycle.cropId },
      });
      if (!stage) throw new SafeActionError("NOT_FOUND", "Growth stage not found.");
    }
    const beforeStage = context.cycle.growthStageId;
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.cropCycle.update({
        where: { id: context.cycle.id },
        data: {
          variety: data.variety,
          actualPlantingDate: data.actualPlantingDate
            ? new Date(`${data.actualPlantingDate}T12:00:00Z`)
            : undefined,
          expectedHarvestDate: data.expectedHarvestDate
            ? new Date(`${data.expectedHarvestDate}T12:00:00Z`)
            : undefined,
          growthStageId: data.growthStageId || undefined,
          populationTarget: data.populationTarget,
          expectedYieldKg: data.expectedYieldKg,
          actualHarvestDate: data.actualHarvestDate
            ? new Date(`${data.actualHarvestDate}T12:00:00Z`)
            : undefined,
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
          metadata: { fromStageId: beforeStage, toStageId: row.growthStageId },
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
    const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (existing) throw new SafeActionError("VALIDATION", "A user with this email address already exists.");
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: data.name, email: data.email, passwordHash, role: data.role },
      });
      await tx.farmMembership.create({
        data: { farmId: context.farm.id, userId: created.id, role: data.role },
      });
      await tx.auditLog.create({
        data: {
          farmId: context.farm.id,
          userId: context.user.id,
          action: "USER_CREATE",
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
    sectors: Array<{ id: string; name: string; flowM3h: number }>;
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
    const flowM3h = Number((setting?.value as Record<string, unknown> | null)?.sectorFlowM3h ?? 11);
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
