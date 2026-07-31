import {addDays, endOfDay, endOfWeek, startOfDay, startOfWeek} from "date-fns";
import {fromZonedTime, toZonedTime} from "date-fns-tz";

export function farmDayBounds(timezone: string, date = new Date()) {
  const zoned = toZonedTime(date, timezone);
  return {
    start: fromZonedTime(startOfDay(zoned), timezone),
    end: fromZonedTime(endOfDay(zoned), timezone),
  };
}

export function farmWeekBounds(timezone: string, date = new Date()) {
  const zoned = toZonedTime(date, timezone);
  return {
    start: fromZonedTime(startOfWeek(zoned, {weekStartsOn: 1}), timezone),
    end: fromZonedTime(endOfWeek(zoned, {weekStartsOn: 1}), timezone),
  };
}

export function nextFarmDays(timezone: string, days: number, date = new Date()) {
  const {start} = farmDayBounds(timezone, date);
  return {start, end: addDays(start, days)};
}

export function formatFarmDate(value: Date | string, timezone: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", {timeZone: timezone, ...options}).format(new Date(value));
}

export function combineFarmDateTime(date: string, time: string, timezone: string) {
  return fromZonedTime(`${date}T${time || "00:00"}:00`, timezone);
}

