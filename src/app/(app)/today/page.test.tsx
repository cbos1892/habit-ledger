import { describe, expect, it, vi } from "vitest";

import { getCurrentTimeZoneContext } from "../../../lib/profile";
import { getTodayViewModel } from "../../../lib/today";
import TodayPage from "./page";
import { TodayView } from "./today-view";

vi.mock("../../../lib/profile", () => ({
  getCurrentTimeZoneContext: vi.fn(),
}));

vi.mock("../../../lib/today", () => ({
  getTodayViewModel: vi.fn(),
}));
vi.mock("./completion-actions", () => ({
  setHabitCompletion: vi.fn(),
}));

describe("Today page", () => {
  it("loads the current user's local Today view model", async () => {
    vi.mocked(getCurrentTimeZoneContext).mockResolvedValue({
      id: "user-123",
      time_zone: "America/New_York",
    });
    vi.mocked(getTodayViewModel).mockResolvedValue({
      completedCount: 0,
      habits: [
        {
          id: "habit-a",
          name: "Morning walk",
          icon: "🚶",
          color: "fern",
          completed: false,
          completionId: null,
          displayOrder: 0,
        },
      ],
      localDate: "2026-08-10",
      status: "ready",
      timeZone: "America/New_York",
      totalCount: 1,
    });

    const result = await TodayPage();

    expect(getTodayViewModel).toHaveBeenCalledWith(
      "user-123",
      "America/New_York",
    );
    expect(result.type).toBe(TodayView);
    expect(result.props.today.totalCount).toBe(1);
  });

  it("keeps an empty day distinct from a query failure", async () => {
    vi.mocked(getCurrentTimeZoneContext).mockResolvedValue({
      id: "user-123",
      time_zone: "UTC",
    });
    vi.mocked(getTodayViewModel).mockResolvedValue({
      completedCount: 0,
      habits: [],
      localDate: "2026-08-10",
      status: "empty",
      timeZone: "UTC",
      totalCount: 0,
    });

    const result = await TodayPage();

    expect(result.type).toBe(TodayView);
    expect(result.props.today.status).toBe("empty");
  });
});
