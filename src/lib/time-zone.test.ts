import { describe, expect, it, vi } from "vitest";

import {
  addLocalDateDays,
  getBrowserTimeZone,
  getLocalWeekDateKeys,
  getLocalWeekDateKeysFromDate,
  getLocalWeekStartDate,
  isSupportedTimeZone,
  toLocalDateKey,
} from "./time-zone";

describe("time-zone utilities", () => {
  it("accepts supported zones and rejects unsupported values", () => {
    expect(isSupportedTimeZone("America/New_York")).toBe(true);
    expect(isSupportedTimeZone("UTC")).toBe(true);
    expect(isSupportedTimeZone("Not/A_Time_Zone")).toBe(false);
    expect(isSupportedTimeZone("")).toBe(false);
  });

  it("detects the browser's resolved time zone", () => {
    const resolvedOptions = vi
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockReturnValue({
        calendar: "gregory",
        locale: "en-US",
        numberingSystem: "latn",
        timeZone: "America/Los_Angeles",
      });

    expect(getBrowserTimeZone()).toBe("America/Los_Angeles");
    resolvedOptions.mockRestore();
  });

  it("converts one instant to the correct local calendar dates", () => {
    const instant = "2026-08-06T02:30:00.000Z";

    expect(toLocalDateKey(instant, "America/New_York")).toBe("2026-08-05");
    expect(toLocalDateKey(instant, "Asia/Tokyo")).toBe("2026-08-06");
  });

  it("adds calendar days without crossing incorrectly at DST", () => {
    expect(addLocalDateDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addLocalDateDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(() => addLocalDateDays("2026-02-30", 1)).toThrow(
      "Invalid local date",
    );
  });

  it("returns a stable Monday-to-Sunday local week", () => {
    expect(
      getLocalWeekDateKeys("2026-08-06T02:30:00.000Z", "America/New_York"),
    ).toEqual([
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
    ]);
  });

  it("derives week boundaries directly from local calendar dates", () => {
    expect(getLocalWeekStartDate("2026-01-01")).toBe("2025-12-29");
    expect(getLocalWeekDateKeysFromDate("2026-03-08")).toEqual([
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
      "2026-03-05",
      "2026-03-06",
      "2026-03-07",
      "2026-03-08",
    ]);
    expect(getLocalWeekStartDate("2026-01-01", 0)).toBe("2025-12-28");
  });

  it("rejects invalid local dates before deriving week boundaries", () => {
    expect(() => getLocalWeekStartDate("2026-02-30")).toThrow(
      "Invalid local date",
    );
    expect(() => getLocalWeekDateKeysFromDate("not-a-date")).toThrow(
      "Invalid local date",
    );
  });
});
