import { describe, expect, it, vi } from "vitest";

import { getCurrentProfile } from "../../../lib/profile";
import { getStatisticsViewModel } from "../../../lib/stats";
import StatsPage from "./page";
import { StatsView } from "./stats-view";

vi.mock("../../../lib/profile", () => ({
  getCurrentProfile: vi.fn(),
}));
vi.mock("../../../lib/stats", () => ({
  getStatisticsViewModel: vi.fn(),
}));

describe("Stats page", () => {
  it("loads the authenticated user's local statistics with their week start", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue({
      id: "user-123",
      time_zone: "America/New_York",
      time_zone_confirmed_at: null,
      time_zone_source: "automatic",
      week_starts_on: 0,
    });
    vi.mocked(getStatisticsViewModel).mockResolvedValue({
      currentLocalDate: "2026-08-10",
      habits: [],
      overall: {
        completedCount: 9,
        endDate: "2026-08-10",
        opportunityCount: 14,
        percentage: 64,
        startDate: "2026-07-28",
      },
      status: "ready",
      timeZone: "America/New_York",
      weekStartsOn: 0,
      weekly: [],
    });

    const result = await StatsPage();

    expect(getCurrentProfile).toHaveBeenCalledOnce();
    expect(getStatisticsViewModel).toHaveBeenCalledWith(
      "user-123",
      "America/New_York",
      { weekStartsOn: 0 },
    );
    expect(result.type).toBe(StatsView);
    expect(result.props.statistics.overall.percentage).toBe(64);
  });

  it("keeps a valid empty model distinct from a route failure", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue({
      id: "user-123",
      time_zone: "UTC",
      time_zone_confirmed_at: null,
      time_zone_source: "manual",
      week_starts_on: 1,
    });
    vi.mocked(getStatisticsViewModel).mockResolvedValue({
      currentLocalDate: "2026-08-10",
      habits: [],
      overall: {
        completedCount: 0,
        endDate: "2026-08-10",
        opportunityCount: 0,
        percentage: null,
        startDate: "2026-07-28",
      },
      status: "no-habits",
      timeZone: "UTC",
      weekStartsOn: 1,
      weekly: [],
    });

    const result = await StatsPage();

    expect(result.type).toBe(StatsView);
    expect(result.props.statistics.status).toBe("no-habits");
  });
});
