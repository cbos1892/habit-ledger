import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { getTodayViewModel } from "./today";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const finalOrder = vi.fn();
const firstOrder = vi.fn(() => ({ order: finalOrder }));
const completionEnd = vi.fn(() => ({ order: firstOrder }));
const completionStart = vi.fn(() => ({ lte: completionEnd }));
const archivedIs = vi.fn(() => ({ gte: completionStart }));
const ownerEq = vi.fn(() => ({ is: archivedIs }));
const select = vi.fn(() => ({ eq: ownerEq }));
const from = vi.fn(() => ({ select }));

describe("today view model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ from } as never);
  });

  it("returns only locally scheduled habits with completion state and stable order", async () => {
    finalOrder.mockResolvedValue({
      data: [
        {
          id: "habit-a",
          name: "Morning walk",
          icon: "🚶",
          color: "fern",
          display_order: 10,
          start_date: "2026-08-01",
          habit_schedules: [{ weekday: 1 }],
          completions: [
            {
              id: "completion-a",
              local_date: "2026-08-10",
            },
          ],
        },
        {
          id: "habit-b",
          name: "Tuesday habit",
          icon: "📚",
          color: "plum",
          display_order: 20,
          start_date: "2026-08-01",
          habit_schedules: [{ weekday: 2 }],
          completions: [],
        },
        {
          id: "habit-c",
          name: "Evening stretch",
          icon: "🧘",
          color: "sun",
          display_order: 30,
          start_date: "2026-08-10",
          habit_schedules: [{ weekday: 1 }],
          completions: [],
        },
      ],
      error: null,
    });

    const result = await getTodayViewModel(
      "user-123",
      "America/New_York",
      "2026-08-11T02:30:00.000Z",
    );

    expect(result).toEqual({
      completedCount: 1,
      progress: { completedCount: 1, totalCount: 2 },
      sections: [
        {
          kind: "standalone",
          progress: { completedCount: 1, totalCount: 2 },
          habits: [
            {
              id: "habit-a",
              name: "Morning walk",
              icon: "🚶",
              color: "fern",
              completed: true,
              completionId: "completion-a",
              displayOrder: 10,
              routineDisplayOrder: null,
            },
            {
              id: "habit-c",
              name: "Evening stretch",
              icon: "🧘",
              color: "sun",
              completed: false,
              completionId: null,
              displayOrder: 30,
              routineDisplayOrder: null,
            },
          ],
        },
      ],
      localDate: "2026-08-10",
      status: "ready",
      timeZone: "America/New_York",
      totalCount: 2,
    });
    expect(ownerEq).toHaveBeenCalledWith("owner_id", "user-123");
    expect(archivedIs).toHaveBeenCalledWith("archived_at", null);
    expect(completionStart).toHaveBeenCalledWith(
      "completions.local_date",
      "2026-08-04",
    );
    expect(completionEnd).toHaveBeenCalledWith(
      "completions.local_date",
      "2026-08-10",
    );
    expect(firstOrder).toHaveBeenCalledWith("display_order");
    expect(finalOrder).toHaveBeenCalledWith("id");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.sections)).toBe(true);
  });

  it.each([
    ["2026-08-12", 0, [], false],
    ["2026-08-13", 0, [], true],
    ["2026-08-14", 1, ["2026-08-10"], true],
    ["2026-08-14", 2, ["2026-08-10", "2026-08-11"], false],
    ["2026-08-15", 3, ["2026-08-10", "2026-08-11", "2026-08-12"], false],
  ] as const)(
    "uses the saved Sunday week start and earlier check-ins on %s",
    async (date, completedBefore, dates, requiredToday) => {
      finalOrder.mockResolvedValue({
        data: [
          {
            id: "workout",
            name: "Work out",
            weekly_target: 3,
            start_date: "2026-08-01",
            habit_schedules: [],
            profiles: { week_starts_on: 0 },
            completions: ["2026-08-08", ...dates].map((local_date) => ({
              id: local_date,
              local_date,
            })),
          },
        ],
        error: null,
      });

      const today = await getTodayViewModel(
        "user-123",
        "UTC",
        `${date}T12:00:00Z`,
      );

      expect(today.totalCount).toBe(Number(requiredToday));
      expect(today.sections[0].habits[0].weeklyTarget).toEqual({
        target: 3,
        completedBefore,
        requiredToday,
      });
    },
  );

  it("does not shift the local day near UTC midnight", async () => {
    finalOrder.mockResolvedValue({ data: [], error: null });

    const newYork = await getTodayViewModel(
      "user-123",
      "America/New_York",
      "2026-08-11T02:30:00.000Z",
    );
    const tokyo = await getTodayViewModel(
      "user-123",
      "Asia/Tokyo",
      "2026-08-11T02:30:00.000Z",
    );

    expect(newYork.localDate).toBe("2026-08-10");
    expect(tokyo.localDate).toBe("2026-08-11");
  });

  it("returns an explicit empty state", async () => {
    finalOrder.mockResolvedValue({ data: [], error: null });

    await expect(
      getTodayViewModel("user-123", "UTC", "2026-08-10T12:00:00.000Z"),
    ).resolves.toEqual({
      completedCount: 0,
      progress: { completedCount: 0, totalCount: 0 },
      sections: [],
      localDate: "2026-08-10",
      status: "empty",
      timeZone: "UTC",
      totalCount: 0,
    });
  });

  it("returns the same calm empty state when habits exist but none are scheduled", async () => {
    finalOrder.mockResolvedValue({
      data: [
        {
          id: "habit-tuesday",
          name: "Tuesday habit",
          icon: "📚",
          color: "plum",
          display_order: 0,
          start_date: "2026-08-01",
          habit_schedules: [{ weekday: 2 }],
          completions: [],
        },
      ],
      error: null,
    });

    await expect(
      getTodayViewModel("user-123", "UTC", "2026-08-10T12:00:00.000Z"),
    ).resolves.toEqual({
      completedCount: 0,
      progress: { completedCount: 0, totalCount: 0 },
      sections: [],
      localDate: "2026-08-10",
      status: "empty",
      timeZone: "UTC",
      totalCount: 0,
    });
  });

  it("returns standalone habits before joined routines without duplicating habits", async () => {
    finalOrder.mockResolvedValue({
      data: [
        {
          id: "routine-habit",
          name: "Journal",
          icon: "✍️",
          color: "sun",
          display_order: 0,
          routine_id: "routine-a",
          routine_display_order: 0,
          routines: { id: "routine-a", name: "Morning", display_order: 0 },
          start_date: "2026-08-01",
          habit_schedules: [{ weekday: 1 }],
          completions: [],
        },
        {
          id: "standalone",
          name: "Walk",
          icon: "🚶",
          color: "fern",
          display_order: 10,
          routine_id: null,
          routine_display_order: null,
          routines: null,
          start_date: "2026-08-01",
          habit_schedules: [{ weekday: 1 }],
          completions: [],
        },
      ],
      error: null,
    });

    const result = await getTodayViewModel(
      "user-123",
      "UTC",
      "2026-08-10T12:00:00.000Z",
    );

    expect(result.sections.map(({ kind }) => kind)).toEqual([
      "standalone",
      "routine",
    ]);
    expect(
      result.sections.flatMap(({ habits }) => habits.map(({ id }) => id)),
    ).toEqual(["standalone", "routine-habit"]);
  });

  it("keeps query failures distinct from an empty result", async () => {
    finalOrder.mockResolvedValue({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(
      getTodayViewModel("user-123", "UTC", "2026-08-10T12:00:00.000Z"),
    ).rejects.toThrow("Unable to load today's habits.");
  });
});
