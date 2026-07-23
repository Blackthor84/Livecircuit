import { utcDateKey } from "@/lib/services/coins-rewards";

export function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function monthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

export function periodKeyForCadence(cadence: string, d = new Date()): string {
  if (cadence === "weekly") return isoWeekKey(d);
  if (cadence === "monthly") return monthKey(d);
  return utcDateKey(d);
}

export function periodStartIso(cadence: string, d = new Date()): string {
  if (cadence === "daily") {
    return `${utcDateKey(d)}T00:00:00.000Z`;
  }
  if (cadence === "monthly") {
    return `${monthKey(d)}-01T00:00:00.000Z`;
  }
  const date = new Date(d);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - (day - 1));
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

/** Total XP required to reach `level` (level 1 = 0 XP). */
export function xpThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  return (level - 1) * (level - 1) * 50;
}

export function levelFromTotalXp(xp: number): number {
  let level = 1;
  while (xp >= xpThresholdForLevel(level + 1)) level += 1;
  return level;
}

export function prestigeFromLevel(level: number): number {
  return Math.floor((level - 1) / 15);
}

export function xpProgressInLevel(xp: number, level: number): { current: number; needed: number; percent: number } {
  const floor = xpThresholdForLevel(level);
  const ceiling = xpThresholdForLevel(level + 1);
  const needed = ceiling - floor;
  const current = xp - floor;
  return {
    current,
    needed,
    percent: needed > 0 ? Math.min(100, Math.round((current / needed) * 100)) : 100,
  };
}
