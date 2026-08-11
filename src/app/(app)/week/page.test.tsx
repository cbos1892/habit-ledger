import { describe, expect, it, vi } from "vitest";

import { requireConfiguredProfile } from "../../../lib/profile";
import { getWeeklyViewModel } from "../../../lib/week";
import WeekPage from "./page";
import { WeekView } from "./week-view";

vi.mock("../../../lib/profile", () => ({
  requireConfiguredProfile: vi.fn(),
}));
vi.mock("../../../lib/week", () => ({
  getWeeklyViewModel: vi.fn(),
}));

describe("Week page", () => {
  it("loads the current user's local weekly view model", async () => {
    vi.mocked(requireConfiguredProfile).mockResolvedValue({
      id: "user-123",
      time_zone: "America/New_York",
      time_zone_confirmed_at: "2026-08-10T12:00:00.000Z",
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

    const result = await WeekPage();

    expect(getWeeklyViewModel).toHaveBeenCalledWith(
      "user-123",
      "America/New_York",
    );
    expect(result.type).toBe(WeekView);
    expect(result.props.week.currentLocalDate).toBe("2026-08-11");
  });
});
