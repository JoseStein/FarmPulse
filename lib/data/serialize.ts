import type {Decimal} from "@prisma/client/runtime/library";

export function decimal(value: Decimal | number | string | null | undefined) {
  return value == null ? null : Number(value);
}

export function iso(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

export function jsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

