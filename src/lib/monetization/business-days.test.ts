import { describe, expect, it } from "vitest";
import { fastPayEligibilityInstant, zonedParts } from "@/lib/monetization/business-days";

const TZ = "America/New_York";

function completionLocal(y: number, m: number, d: number, hour = 20): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  return new Date(`${y}-${pad(m)}-${pad(d)}T${pad(hour)}:30:00-04:00`);
}

function eligibilityDateKey(instant: Date): string {
  const p = zonedParts(instant, TZ);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

describe("fastPay business days (America/New_York)", () => {
  it("Monday completion → Tuesday eligibility", () => {
    const ended = completionLocal(2026, 6, 1);
    expect(eligibilityDateKey(fastPayEligibilityInstant(ended))).toBe("2026-06-02");
  });

  it("Thursday completion → Friday eligibility", () => {
    const ended = completionLocal(2026, 6, 4);
    expect(eligibilityDateKey(fastPayEligibilityInstant(ended))).toBe("2026-06-05");
  });

  it("Friday completion → Monday eligibility", () => {
    const ended = completionLocal(2026, 6, 5);
    expect(eligibilityDateKey(fastPayEligibilityInstant(ended))).toBe("2026-06-08");
  });

  it("Saturday completion → Monday eligibility", () => {
    const ended = completionLocal(2026, 6, 6);
    expect(eligibilityDateKey(fastPayEligibilityInstant(ended))).toBe("2026-06-08");
  });

  it("Sunday completion → Monday eligibility", () => {
    const ended = completionLocal(2026, 6, 7);
    expect(eligibilityDateKey(fastPayEligibilityInstant(ended))).toBe("2026-06-08");
  });

  it("supports optional holiday hook", () => {
    const ended = completionLocal(2026, 6, 1);
    const withHoliday = fastPayEligibilityInstant(ended, {
      isHoliday: (key) => key === "2026-06-02",
    });
    expect(eligibilityDateKey(withHoliday)).toBe("2026-06-03");
  });
});
