import { describe, expect, it, vi } from "vitest";

import { getCurrentProfile } from "../../../lib/profile";
import { getWeeklyViewModel } from "../../../lib/week";
import WeekPage from "./page";
import { WeekView } from "./week-view";

vi.mock("../../../lib/profile", () => ({
  getCurrentProfile: vi.fn(),
}));
vi.mock("../../../lib/week", () => ({
  getWeeklyViewModel: vi.fn(),
}));
vi.mock("./completion-actions", () => ({
  setHabitCompletion: vi.fn(),
}));

describe("Week page", () => {
  it("loads the current user's local weekly view model", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue({
      id: "user-123",
      time_zone: "America/New_York",
      time_zone_confirmed_at: null,
      time_zone_source: "automatic",
      week_starts_on: 1,
    });
    vi.mocked(getWeeklyViewModel).mockResolvedValue({
      currentLocalDate: "2026-08-11",
      endDate: "2026-08-16",
      localDates: [
        "2026-08-10",
        "2026-08-11",
        "2026-08-12",
        "2026-08-13",
        "2026-08-14",
        "2026-08-15",
        "2026-08-16",
      ],
      rows: [],
      startDate: "2026-08-10",
      status: "empty",
      timeZone: "America/New_York",
      weekStartsOn: 1,
    });

    const result = await WeekPage({ searchParams: Promise.resolve({}) });

    expect(getWeeklyViewModel).toHaveBeenCalledWith(
      "user-123",
      "America/New_York",
      {
        selectedWeekStart: undefined,
        weekStartsOn: 1,
      },
    );
    expect(result.type).toBe(WeekView);
    expect(result.props.week.currentLocalDate).toBe("2026-08-11");
  });

  it("loads the URL-selected local week", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue({
      id: "user-123",
      time_zone: "America/New_York",
      time_zone_confirmed_at: null,
      time_zone_source: "automatic",
      week_starts_on: 0,
    });
    vi.mocked(getWeeklyViewModel).mockResolvedValue({
      currentLocalDate: "2026-08-11",
      endDate: "2026-08-09",
      localDates: [
        "2026-08-03",
        "2026-08-04",
        "2026-08-05",
        "2026-08-06",
        "2026-08-07",
        "2026-08-08",
        "2026-08-09",
      ],
      rows: [],
      startDate: "2026-08-03",
      status: "empty",
      timeZone: "America/New_York",
      weekStartsOn: 0,
    });

    await WeekPage({
      searchParams: Promise.resolve({ week: "2026-08-03" }),
    });

    expect(getWeeklyViewModel).toHaveBeenCalledWith(
      "user-123",
      "America/New_York",
      {
        selectedWeekStart: "2026-08-03",
        weekStartsOn: 0,
      },
    );
  });
});
