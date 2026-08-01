import { z } from "zod";

export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(8) });
export const farmUserCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(12).max(128),
  role: z.enum(["ADMIN", "OPERATOR"]),
});
export const farmUserAccessSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["ADMIN", "OPERATOR"]),
  active: z.boolean(),
});
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(12).max(128),
  confirmPassword: z.string().min(12).max(128),
}).superRefine((data, context) => {
  if (data.newPassword !== data.confirmPassword)
    context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
  if (data.newPassword === data.currentPassword)
    context.addIssue({ code: "custom", path: ["newPassword"], message: "Choose a password you have not already used." });
});
export const idSchema = z.string().uuid();
export const idempotencySchema = z.string().uuid();

export const taskStatusSchema = z.object({
  taskId: idSchema,
  status: z.enum(["IN_PROGRESS", "COMPLETED", "SKIPPED"]),
  completionNotes: z.string().trim().max(2000).optional(),
  createActivity: z.boolean().default(false),
});

export const taskCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  sectorId: idSchema.optional().or(z.literal("")),
  category: z.string().trim().min(2).max(80),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  dueDate: z.string().date(),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/),
  assignedUserId: idSchema.optional().or(z.literal("")),
});

export const activitySchema = z.object({
  type: z.enum([
    "PLANTING",
    "IRRIGATION",
    "FERTILIZER_APPLICATION",
    "PESTICIDE_APPLICATION",
    "HERBICIDE_APPLICATION",
    "PEST_INSPECTION",
    "DISEASE_INSPECTION",
    "WEED_CONTROL",
    "SOIL_WORK",
    "EQUIPMENT_MAINTENANCE",
    "RAINFALL_OBSERVATION",
    "FIELD_OBSERVATION",
    "HARVEST",
    "OTHER",
  ]),
  sectorId: idSchema.optional().or(z.literal("")),
  cropCycleId: idSchema.optional(),
  date: z.string().date(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .or(z.literal("")),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .or(z.literal("")),
  durationMinutes: z.coerce.number().int().positive().max(1440).optional(),
  quantity: z.coerce.number().nonnegative().max(1_000_000).optional(),
  unit: z.string().trim().max(40).optional(),
  productUsed: z.string().trim().max(160).optional(),
  inventoryItemId: idSchema.optional().or(z.literal("")),
  inventoryQuantity: z.coerce.number().positive().max(1_000_000).optional(),
  allowNegativeStock: z.boolean().default(false),
  worker: z.string().trim().max(120).optional(),
  cost: z.coerce.number().nonnegative().max(1_000_000).optional(),
  notes: z.string().trim().max(2000).optional(),
  flowM3h: z.coerce.number().positive().max(1000).optional(),
  pressureBar: z.coerce.number().nonnegative().max(50).optional(),
  taskId: idSchema.optional(),
  idempotencyKey: idempotencySchema,
});

export const expenseSchema = z.object({
  id: idSchema.optional(),
  date: z.string().date(),
  vendor: z.string().trim().max(120).optional(),
  description: z.string().trim().min(2).max(200),
  category: z.string().trim().min(1).max(80),
  amount: z.coerce.number().positive().max(1_000_000),
  sectorId: idSchema.optional().or(z.literal("")),
  quantity: z.coerce.number().positive().max(1_000_000).optional(),
  unitCost: z.coerce.number().nonnegative().max(1_000_000).optional(),
  notes: z.string().trim().max(2000).optional(),
  idempotencyKey: idempotencySchema,
});

export const fieldNoteSchema = z.object({
  sectorId: idSchema.optional().or(z.literal("")),
  category: z.string().trim().min(2).max(80),
  body: z.string().trim().min(2).max(5000),
  isIssue: z.boolean().default(false),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  issueTitle: z.string().trim().max(160).optional(),
  assignedUserId: idSchema.optional().or(z.literal("")),
  createFollowUpTask: z.boolean().default(false),
  idempotencyKey: idempotencySchema,
});

export const issueStatusSchema = z.object({
  issueId: idSchema,
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
  resolutionNotes: z.string().trim().max(2000).optional(),
});

export const inventoryItemSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(80),
  quantityOnHand: z.coerce.number().nonnegative(),
  unit: z.string().trim().min(1).max(40),
  minimumThreshold: z.coerce.number().nonnegative(),
  unitCost: z.coerce.number().nonnegative().optional(),
  supplier: z.string().trim().max(160).optional(),
  storageLocation: z.string().trim().max(160).optional(),
  expirationDate: z.string().date().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
});
export const stockAdjustmentSchema = z.object({
  itemId: idSchema,
  quantity: z.coerce.number().refine((v) => v !== 0),
  reason: z.string().trim().min(2).max(500),
});

export const equipmentSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(2).max(160),
  type: z.string().trim().min(2).max(80),
  status: z.string().trim().min(2).max(80),
  manufacturer: z.string().trim().max(120).optional(),
  model: z.string().trim().max(120).optional(),
  runtimeHours: z.coerce.number().nonnegative().optional(),
  nextMaintenance: z.string().date().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
});
export const maintenanceSchema = z.object({
  equipmentId: idSchema,
  description: z.string().trim().min(2).max(1000),
  performedAt: z.string().date(),
  cost: z.coerce.number().nonnegative().optional(),
  runtimeHours: z.coerce.number().nonnegative().optional(),
  nextMaintenance: z.string().date().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
});

export const cropCycleSchema = z.object({
  variety: z.string().trim().max(120).optional(),
  actualPlantingDate: z.string().date().optional().or(z.literal("")),
  expectedHarvestDate: z.string().date().optional().or(z.literal("")),
  growthStageId: idSchema.optional().or(z.literal("")),
  populationTarget: z.coerce.number().int().positive().optional(),
  expectedYieldKg: z.coerce.number().nonnegative().optional(),
  actualHarvestDate: z.string().date().optional().or(z.literal("")),
  actualYieldKg: z.coerce.number().nonnegative().optional(),
  status: z.enum(["ACTIVE", "COMPLETED"]).optional(),
});
export const farmSettingsSchema = z.object({
  name: z.string().trim().min(2).max(160),
  country: z.string().trim().min(2).max(100),
  timezone: z.string().trim().min(2).max(100),
  currency: z.string().trim().length(3),
  unitSystem: z.enum(["METRIC", "US"]),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});
