import "server-only";
import {auth} from "@/auth";
import {prisma} from "@/lib/prisma";
import type {Role} from "@prisma/client";

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
  const field = await prisma.field.findFirst({
    where: {farmId: context.farm.id, status: "ACTIVE", deletedAt: null},
    orderBy: {createdAt: "asc"},
    select: {id: true, name: true, areaHa: true, status: true},
  });
  if (!field) throw new SafeActionError("NOT_FOUND", "No active field is configured for this farm.");
  return {...context, field};
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

export function requireRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) throw new SafeActionError("FORBIDDEN", "You do not have permission to perform this action.");
}

