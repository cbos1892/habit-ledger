import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { getStatisticsViewModel } from "./stats";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const finalOrder = vi.fn();
const firstOrder = vi.fn(() => ({ order: finalOrder }));
const completionEndLte = vi.fn(() => ({ order: firstOrder }));
const completionStartGte = vi.fn(() => ({ lte: completionEndLte }));
const ownerEq = vi.fn(() => ({ gte: completionStartGte }));
const select = vi.fn(() => ({ eq: ownerEq }));
const from = vi.fn(() => ({ select }));

const everyWeekday = Array.from({ length: 7 }, (_, index) => ({
  weekday: index + 1,
}));

type HabitRecord = {
  archived_at: string | null;
  color: string;
  completions: { local_date: string }[];
  display_order: number;
  habit_schedules: { weekday: number }[];
  icon: string;
  id: string;
  name: string;
  start_date: string;
};

function habit(overrides: Partial<HabitRecord> = {}): HabitRecord {
  return {
    archived_at: null,
    color: "fern",
    completions: [],
    display_order: 10,
    habit_schedules: everyWeekday,
    icon: "🌱",
    id: "habit-a",
    name: "Habit A",
    start_date: "2026-01-01",
    ...overrides,
  };
}

function complete(localDates: readonly string[]) {
  return localDates.map((local_date) => ({ local_date }));
}

describe("statistics view model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ from } as never);
  });

  it("uses the user's local date at a UTC boundary and one owner-scoped bounded query", async () => {
    finalOrder.mockResolvedValue({ data: [], error: null });

    const result = await getStatisticsViewModel(
      "user-123",
      "America/New_York",
      {
        instant: "2026-08-11T02:30:00.000Z",
      },
    );

    expect(result.currentLocalDate).toBe("2026-08-10");
    expect(result.overall).toEqual({
      completedCount: 0,
      endDate: "2026-08-10",
      opportunityCount: 0,
      percentage: null,
      startDate: "2026-07-28",
    });
    expect(result.weekly).toHaveLength(8);
    expect(result.weekly[0]).toMatchObject({
      startDate: "2026-06-22",
      endDate: "2026-06-28",
    });
    expect(result.weekly[7]).toEqual({
      completedCount: 0,
      endDate: "2026-08-16",
      isCurrentWeek: true,
      isPartial: true,
      opportunityCount: 0,
      percentage: null,
      startDate: "2026-08-10",
    });
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("habits");
    expect(ownerEq).toHaveBeenCalledWith("owner_id", "user-123");
    expect(completionStartGte).toHaveBeenCalledWith(
      "completions.local_date",
      "2026-06-22",
    );
    expect(completionEndLte).toHaveBeenCalledWith(
      "completions.local_date",
      "2026-08-10",
    );
    expect(firstOrder).toHaveBeenCalledWith("display_order");
    expect(finalOrder).toHaveBeenCalledWith("id");
  });

  it("combines mixed schedules, ignores off-schedule completions, and rounds only percentages", async () => {
    const summaryDates = [
      "2026-07-28",
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
      "2026-08-10",
    ];

    finalOrder.mockResolvedValue({
      data: [
        habit({
          completions: complete(summaryDates),
          id: "daily",
          name: "Daily",
        }),
        habit({
          color: "plum",
          completions: complete([
            "2026-07-29",
            "2026-07-31",
            "2026-08-03",
            "2026-08-06",
            "2026-08-10",
          ]),
          display_order: 20,
          habit_schedules: [{ weekday: 1 }, { weekday: 3 }, { weekday: 5 }],
          icon: "🏃",
          id: "mwf",
          name: "Monday Wednesday Friday",
        }),
        habit({
          color: "sun",
          completions: complete(["2026-08-04"]),
          display_order: 30,
          habit_schedules: [{ weekday: 2 }],
          icon: "📚",
          id: "tuesday",
          name: "Tuesday",
          start_date: "2026-08-04",
        }),
      ],
      error: null,
    });

    const result = await getStatisticsViewModel("user-123", "UTC", {
      instant: "2026-08-10T12:00:00.000Z",
    });

    expect(result.status).toBe("ready");
    expect(result.overall).toEqual({
      completedCount: 19,
      endDate: "2026-08-10",
      opportunityCount: 21,
      percentage: 90,
      startDate: "2026-07-28",
    });
    expect(result.habits).toEqual([
      expect.objectContaining({
        id: "daily",
        completedCount: 14,
        opportunityCount: 14,
        percentage: 100,
        hasPositiveContinuity: true,
      }),
      expect.objectContaining({
        id: "mwf",
        completedCount: 4,
        opportunityCount: 6,
        percentage: 67,
        hasPositiveContinuity: false,
      }),
      expect.objectContaining({
        id: "tuesday",
        completedCount: 1,
        opportunityCount: 1,
        percentage: 100,
        hasPositiveContinuity: true,
      }),
    ]);
  });

  it("applies start and archive local dates inclusively while keeping archived habits out of current insights", async () => {
    finalOrder.mockResolvedValue({
      data: [
        habit({
          archived_at: "2026-08-04T12:00:00.000Z",
          completions: complete([
            "2026-07-28",
            "2026-07-29",
            "2026-07-30",
            "2026-07-31",
            "2026-08-01",
            "2026-08-02",
            "2026-08-03",
            "2026-08-04",
          ]),
          id: "archived",
          name: "Archived",
        }),
        habit({
          completions: complete(["2026-08-08"]),
          display_order: 20,
          id: "started-late",
          name: "Started late",
          start_date: "2026-08-08",
        }),
        habit({
          display_order: 30,
          id: "future",
          name: "Future",
          start_date: "2026-08-15",
        }),
      ],
      error: null,
    });

    const result = await getStatisticsViewModel("user-123", "UTC", {
      instant: "2026-08-10T12:00:00.000Z",
    });

    expect(result.overall).toMatchObject({
      completedCount: 9,
      opportunityCount: 11,
      percentage: 82,
    });
    expect(result.habits.map(({ id }) => id)).toEqual([
      "started-late",
      "future",
    ]);
    expect(result.habits[0]).toMatchObject({
      completedCount: 1,
      opportunityCount: 3,
      percentage: 33,
    });
    expect(result.habits[1]).toMatchObject({
      completedCount: 0,
      opportunityCount: 0,
      percentage: null,
      hasPositiveContinuity: false,
    });
    expect(result.weekly[5]).toMatchObject({
      completedCount: 6,
      opportunityCount: 7,
      percentage: 86,
      startDate: "2026-07-27",
    });
    expect(result.weekly[6]).toMatchObject({
      completedCount: 3,
      opportunityCount: 4,
      percentage: 75,
      startDate: "2026-08-03",
    });
    expect(result.weekly[7]).toMatchObject({
      completedCount: 0,
      opportunityCount: 1,
      percentage: 0,
      startDate: "2026-08-10",
    });
  });

  it("converts archive instants to the user's local calendar boundary", async () => {
    const archivedHabit = habit({
      archived_at: "2026-08-05T02:30:00.000Z",
      completions: complete(["2026-08-04", "2026-08-05"]),
      start_date: "2026-08-04",
    });
    finalOrder.mockResolvedValue({ data: [archivedHabit], error: null });

    const newYork = await getStatisticsViewModel(
      "user-123",
      "America/New_York",
      { instant: "2026-08-05T02:30:00.000Z" },
    );
    const tokyo = await getStatisticsViewModel("user-123", "Asia/Tokyo", {
      instant: "2026-08-05T02:30:00.000Z",
    });

    expect(newYork).toMatchObject({
      currentLocalDate: "2026-08-04",
      overall: { completedCount: 1, opportunityCount: 1 },
    });
    expect(tokyo).toMatchObject({
      currentLocalDate: "2026-08-05",
      overall: { completedCount: 2, opportunityCount: 2 },
    });
  });

  it.each([
    {
      firstStart: "2026-06-22",
      currentEnd: "2026-08-16",
      currentStart: "2026-08-10",
      weekStartsOn: 1 as const,
    },
    {
      firstStart: "2026-06-21",
      currentEnd: "2026-08-15",
      currentStart: "2026-08-09",
      weekStartsOn: 0 as const,
    },
  ])(
    "returns eight $weekStartsOn-aligned weekly points",
    async ({ currentEnd, currentStart, firstStart, weekStartsOn }) => {
      finalOrder.mockResolvedValue({ data: [], error: null });

      const result = await getStatisticsViewModel("user-123", "UTC", {
        instant: "2026-08-12T12:00:00.000Z",
        weekStartsOn,
      });

      expect(result.weekly).toHaveLength(8);
      expect(result.weekly[0]?.startDate).toBe(firstStart);
      expect(result.weekly[7]).toMatchObject({
        endDate: currentEnd,
        isCurrentWeek: true,
        isPartial: true,
        startDate: currentStart,
      });
      expect(
        result.weekly.filter(({ isCurrentWeek }) => isCurrentWeek),
      ).toHaveLength(1);
    },
  );

  it("keeps the current week partial on its final local day and never counts future completions", async () => {
    finalOrder.mockResolvedValue({
      data: [
        habit({
          completions: complete(["2026-08-16", "2026-08-17"]),
          start_date: "2026-08-16",
        }),
      ],
      error: null,
    });

    const result = await getStatisticsViewModel("user-123", "UTC", {
      instant: "2026-08-16T12:00:00.000Z",
      weekStartsOn: 1,
    });

    expect(result.weekly[7]).toMatchObject({
      completedCount: 1,
      endDate: "2026-08-16",
      isPartial: true,
      opportunityCount: 1,
      percentage: 100,
    });
    expect(completionEndLte).toHaveBeenCalledWith(
      "completions.local_date",
      "2026-08-16",
    );
  });

  it("uses the current saved schedule retrospectively across the full history window", async () => {
    finalOrder.mockResolvedValue({
      data: [
        habit({
          completions: complete(["2026-08-03", "2026-08-04", "2026-08-10"]),
          habit_schedules: [{ weekday: 1 }],
        }),
      ],
      error: null,
    });

    const result = await getStatisticsViewModel("user-123", "UTC", {
      instant: "2026-08-10T12:00:00.000Z",
    });

    expect(result.overall).toMatchObject({
      completedCount: 2,
      opportunityCount: 2,
      percentage: 100,
    });
    expect(result.habits[0]?.hasPositiveContinuity).toBe(true);
  });

  it("returns explicit no-habit and no-opportunity states without misleading zero rates", async () => {
    finalOrder.mockResolvedValueOnce({ data: [], error: null });

    const noHabits = await getStatisticsViewModel("user-123", "UTC", {
      instant: "2026-08-10T12:00:00.000Z",
    });

    finalOrder.mockResolvedValueOnce({
      data: [habit({ start_date: "2026-08-11" })],
      error: null,
    });

    const noOpportunities = await getStatisticsViewModel("user-123", "UTC", {
      instant: "2026-08-10T12:00:00.000Z",
    });

    expect(noHabits).toMatchObject({
      habits: [],
      status: "no-habits",
      overall: { opportunityCount: 0, percentage: null },
    });
    expect(noHabits.weekly).toHaveLength(8);
    expect(noHabits.weekly.every(({ percentage }) => percentage === null)).toBe(
      true,
    );
    expect(noOpportunities).toMatchObject({
      status: "no-opportunities",
      overall: { opportunityCount: 0, percentage: null },
      habits: [
        {
          opportunityCount: 0,
          percentage: null,
          hasPositiveContinuity: false,
        },
      ],
    });
  });

  it("exposes exact ranking inputs and preserves saved order across rounded ties", async () => {
    finalOrder.mockResolvedValue({
      data: [
        habit({
          completions: complete(["2026-08-03", "2026-08-05"]),
          display_order: 10,
          habit_schedules: [{ weekday: 1 }, { weekday: 3 }, { weekday: 5 }],
          id: "two-of-three",
          start_date: "2026-07-30",
        }),
        habit({
          completions: complete([
            "2026-07-29",
            "2026-07-31",
            "2026-08-03",
            "2026-08-05",
          ]),
          display_order: 20,
          habit_schedules: [{ weekday: 1 }, { weekday: 3 }, { weekday: 5 }],
          id: "four-of-six",
        }),
        habit({
          completions: complete(["2026-08-03", "2026-08-05"]),
          display_order: 30,
          habit_schedules: [{ weekday: 1 }, { weekday: 3 }, { weekday: 5 }],
          id: "same-rate-later-order",
          start_date: "2026-07-30",
        }),
      ],
      error: null,
    });

    const result = await getStatisticsViewModel("user-123", "UTC", {
      instant: "2026-08-06T12:00:00.000Z",
    });

    expect(
      result.habits.map(
        ({
          id,
          completedCount,
          opportunityCount,
          percentage,
          displayOrder,
        }) => ({
          id,
          completedCount,
          opportunityCount,
          percentage,
          displayOrder,
        }),
      ),
    ).toEqual([
      {
        id: "two-of-three",
        completedCount: 2,
        opportunityCount: 3,
        percentage: 67,
        displayOrder: 10,
      },
      {
        id: "four-of-six",
        completedCount: 4,
        opportunityCount: 6,
        percentage: 67,
        displayOrder: 20,
      },
      {
        id: "same-rate-later-order",
        completedCount: 2,
        opportunityCount: 3,
        percentage: 67,
        displayOrder: 30,
      },
    ]);
  });

  it("returns deeply frozen presentation structures", async () => {
    finalOrder.mockResolvedValue({ data: [habit()], error: null });

    const result = await getStatisticsViewModel("user-123", "UTC", {
      instant: "2026-08-10T12:00:00.000Z",
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.overall)).toBe(true);
    expect(Object.isFrozen(result.habits)).toBe(true);
    expect(Object.isFrozen(result.habits[0])).toBe(true);
    expect(Object.isFrozen(result.weekly)).toBe(true);
    expect(result.weekly.every(Object.isFrozen)).toBe(true);
  });

  it("keeps an owner-scoped query failure distinct from empty data", async () => {
    finalOrder.mockResolvedValue({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(
      getStatisticsViewModel("user-123", "UTC", {
        instant: "2026-08-10T12:00:00.000Z",
      }),
    ).rejects.toThrow("Unable to load statistics.");
    expect(ownerEq).toHaveBeenCalledWith("owner_id", "user-123");
  });
});
