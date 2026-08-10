import { describe, expect, it } from "vitest";

import { getIsoWeekday, isHabitScheduledAt } from "./habit-schedule";

describe("habit schedule evaluation", () => {
  it("uses ISO weekdays without depending on locale", () => {
    expect(getIsoWeekday("2026-08-10")).toBe(1);
    expect(getIsoWeekday("2026-08-16")).toBe(7);
    expect(() => getIsoWeekday("2026-02-30")).toThrow("Invalid local date");
  });

  it("evaluates the same instant against the user's local calendar date", () => {
    const mondayOnly = { startDate: "2026-08-01", weekdays: [1] as const };
    const instant = "2026-08-11T02:30:00.000Z";

    expect(isHabitScheduledAt(mondayOnly, instant, "America/New_York")).toBe(
      true,
    );
    expect(isHabitScheduledAt(mondayOnly, instant, "Asia/Tokyo")).toBe(false);
  });

  it("respects the local start date", () => {
    const everyDay = {
      startDate: "2026-08-10",
      weekdays: [1, 2, 3, 4, 5, 6, 7] as const,
    };

    expect(
      isHabitScheduledAt(
        everyDay,
        "2026-08-10T03:30:00.000Z",
        "America/New_York",
      ),
    ).toBe(false);
    expect(
      isHabitScheduledAt(
        everyDay,
        "2026-08-10T04:30:00.000Z",
        "America/New_York",
      ),
    ).toBe(true);
  });

  it("stays on the correct local date across daylight-saving boundaries", () => {
    const sundayOnly = { startDate: "2026-01-01", weekdays: [7] as const };

    expect(
      isHabitScheduledAt(
        sundayOnly,
        "2026-03-08T06:30:00.000Z",
        "America/New_York",
      ),
    ).toBe(true);
    expect(
      isHabitScheduledAt(
        sundayOnly,
        "2026-11-01T05:30:00.000Z",
        "America/New_York",
      ),
    ).toBe(true);
  });
});
