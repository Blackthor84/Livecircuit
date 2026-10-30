/**
 * US business-day eligibility for FastPay.
 * Timezone: America/New_York — eligibility begins at 00:00 Eastern on the computed day.
 * Holidays: extend isHoliday later; default none.
 */

export const FASTPAY_BUSINESS_TIMEZONE = "America/New_York";

export type BusinessDayOptions = {
  timeZone?: string;
  /** When true, skip dates returned by isHoliday (future US holiday calendar). */
  isHoliday?: (dateKey: string) => boolean;
};

export function zonedParts(instant: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday");
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const hourRaw = Number(get("hour"));
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: hourRaw === 24 ? 0 : hourRaw,
    dayOfWeek: dayMap[weekday] ?? 0,
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

function addCalendarDaysUtc(year: number, month: number, day: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1, day + delta, 12, 0, 0));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Next business day after the performance completion instant (in Eastern local terms). */
export function nextBusinessDayAfterCompletion(
  completionInstant: Date,
  options: BusinessDayOptions = {},
): Date {
  const timeZone = options.timeZone ?? FASTPAY_BUSINESS_TIMEZONE;
  const parts = zonedParts(completionInstant, timeZone);
  let { year, month, day } = parts;
  const dow = parts.dayOfWeek;

  let addDays: number;
  if (dow >= 1 && dow <= 4) addDays = 1;
  else if (dow === 5) addDays = 3;
  else if (dow === 6) addDays = 2;
  else addDays = 1;

  ({ year, month, day } = addCalendarDaysUtc(year, month, day, addDays));

  let guard = 0;
  while (guard < 14) {
    const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const probeParts = zonedParts(probe, timeZone);
    const isWeekend = probeParts.dayOfWeek === 0 || probeParts.dayOfWeek === 6;
    const holiday = options.isHoliday?.(probeParts.dateKey) ?? false;
    if (!isWeekend && !holiday) break;
    ({ year, month, day } = addCalendarDaysUtc(year, month, day, 1));
    guard += 1;
  }

  return zonedMidnightUtc(year, month, day, timeZone);
}

/** Start of calendar day in `timeZone`, returned as UTC instant. */
export function zonedMidnightUtc(year: number, month: number, day: number, timeZone: string): Date {
  for (let utcHour = 0; utcHour <= 28; utcHour += 1) {
    const candidate = new Date(Date.UTC(year, month - 1, day, utcHour, 0, 0));
    const p = zonedParts(candidate, timeZone);
    if (p.year === year && p.month === month && p.day === day && p.hour === 0) {
      return candidate;
    }
  }
  return new Date(Date.UTC(year, month - 1, day, 5, 0, 0));
}

export function fastPayEligibilityInstant(completionInstant: Date, options?: BusinessDayOptions): Date {
  return nextBusinessDayAfterCompletion(completionInstant, options);
}
