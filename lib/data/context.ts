import "server-only";
import {auth} from "@/auth";
import {prisma} from "@/lib/prisma";
import type {Role} from "@prisma/client";
import { cookies } from "next/headers";

export const SELECTED_FIELD_COOKIE = "farmpulse_selected_field";
export const SELECTED_SECTOR_COOKIE = "farmpulse_selected_sector";

export class SafeActionError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION", message: string) {
    super(message);
  }
}

export async function requireFarmContext() {
  const session = await auth();
  if (!session?.user?.id) throw new SafeActionError("UNAUTHENTICATED", "Please sign in again.");
  const membership = await prisma.farmMembership.findFirst({
    where: {userId: session.user.id},
    orderBy: {farm: {createdAt: "asc"}},
    select: {
      id: true,
      role: true,
      farm: {
        select: {
          id: true,
          name: true,
          locationName: true,
          country: true,
          timezone: true,
          currency: true,
          unitSystem: true,
          latitude: true,
          longitude: true,
        },
      },
      user: {select: {id: true, name: true, email: true, active: true}},
    },
  });
  if (!membership?.user.active) throw new SafeActionError("FORBIDDEN", "You do not have access to an active farm.");
  return {user: membership.user, role: membership.role as Role, farm: membership.farm, membershipId: membership.id};
}

export async function requireActiveField() {
  const context = await requireFarmContext();
  let selectedFieldId: string | null = null;
  try {
    selectedFieldId = (await cookies()).get(SELECTED_FIELD_COOKIE)?.value ?? null;
  } catch {
    // Server actions executed outside a request (for example integration tests) use the first active field.
  }
  const field = await prisma.field.findFirst({
    where: {
      farmId: context.farm.id,
      status: "ACTIVE",
      deletedAt: null,
      ...(selectedFieldId ? { id: selectedFieldId } : {}),
    },
    orderBy: {createdAt: "asc"},
    select: {id: true, name: true, areaHa: true, status: true},
  });
  if (field) return {...context, field};
  const fallback = await prisma.field.findFirst({
    where: { farmId: context.farm.id, status: "ACTIVE", deletedAt: null },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, areaHa: true, status: true },
  });
  if (!fallback) throw new SafeActionError("NOT_FOUND", "No active field is configured for this farm.");
  return { ...context, field: fallback };
}

export async function requireActiveCycle() {
  const context = await requireActiveField();
  const cycle = await prisma.cropCycle.findFirst({
    where: {fieldId: context.field.id, status: "ACTIVE"},
    orderBy: {createdAt: "desc"},
    include: {crop: true, growthStage: true},
  });
  if (!cycle) throw new SafeActionError("NOT_FOUND", "No active crop cycle is configured for this field.");
  return {...context, cycle};
}

export async function verifySector(fieldId: string, sectorId?: string | null) {
  if (!sectorId) return null;
  const sector = await prisma.sector.findFirst({where: {id: sectorId, fieldId}, select: {id: true, name: true, dripLines: true}});
  if (!sector) throw new SafeActionError("NOT_FOUND", "The selected sector does not belong to this field.");
  return sector;
}

export async function getSelectedSector(fieldId: string) {
  let selectedSectorId: string | null = null;
  try {
    selectedSectorId = (await cookies()).get(SELECTED_SECTOR_COOKIE)?.value ?? null;
  } catch {
    // Requests without cookie access (for example integration tests) have no working-sector preference.
  }
  if (!selectedSectorId) return null;
  return prisma.sector.findFirst({
    where: { id: selectedSectorId, fieldId },
    select: { id: true, name: true },
  });
}

export function requireRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) throw new SafeActionError("FORBIDDEN", "You do not have permission to perform this action.");
}
