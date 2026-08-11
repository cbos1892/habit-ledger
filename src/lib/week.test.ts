import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { getWeeklyViewModel } from "./week";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const finalOrder = vi.fn();
const firstOrder = vi.fn(() => ({ order: finalOrder }));
const completionEndLte = vi.fn(() => ({ order: firstOrder }));
const completionStartGte = vi.fn(() => ({ lte: completionEndLte }));
const habitStartLte = vi.fn(() => ({ gte: completionStartGte }));
const ownerEq = vi.fn(() => ({ lte: habitStartLte }));
const select = vi.fn(() => ({ eq: ownerEq }));
const from = vi.fn(() => ({ select }));

describe("weekly view model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ from } as never);
  });

  it("assembles seven ordered cells with completion and schedule states", async () => {
    finalOrder.mockResolvedValue({
      data: [
        {
          id: "habit-a",
          name: "Morning walk",
          icon: "🚶",
          color: "fern",
          display_order: 10,
          start_date: "2026-08-01",
          archived_at: null,
          habit_schedules: [{ weekday: 1 }, { weekday: 3 }],
          completions: [
            { id: "completion-a", local_date: "2026-08-05" },
            { id: "completion-b", local_date: "2026-08-06" },
          ],
        },
      ],
      error: null,
    });

    const result = await getWeeklyViewModel(
      "user-123",
      "America/New_York",
      "2026-08-06T02:30:00.000Z",
    );

    expect(result.localDates).toEqual([
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
    ]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.cells).toEqual([
      {
        completionId: null,
        localDate: "2026-08-03",
        state: "incomplete",
      },
      {
        completionId: null,
        localDate: "2026-08-04",
        state: "not-scheduled",
      },
      {
        completionId: "completion-a",
        localDate: "2026-08-05",
        state: "completed",
      },
      {
        completionId: "completion-b",
        localDate: "2026-08-06",
        state: "completed",
      },
      {
        completionId: null,
        localDate: "2026-08-07",
        state: "not-scheduled",
      },
      {
        completionId: null,
        localDate: "2026-08-08",
        state: "not-scheduled",
      },
      {
        completionId: null,
        localDate: "2026-08-09",
        state: "not-scheduled",
      },
    ]);
    expect(result).toMatchObject({
      currentLocalDate: "2026-08-05",
      endDate: "2026-08-09",
      startDate: "2026-08-03",
      status: "ready",
      timeZone: "America/New_York",
      weekStartsOn: 1,
    });
  });

  it("includes archived habits only on relevant historical dates", async () => {
    finalOrder.mockResolvedValue({
      data: [
        {
          id: "archived-relevant",
          name: "Read",
          icon: "📚",
          color: "plum",
          display_order: 10,
          start_date: "2026-01-01",
          archived_at: "2026-08-05T16:00:00.000Z",
          habit_schedules: [{ weekday: 2 }, { weekday: 4 }],
          completions: [],
        },
        {
          id: "archived-before-week",
          name: "Old habit",
          icon: "🗃️",
          color: "ocean",
          display_order: 20,
          start_date: "2026-01-01",
          archived_at: "2026-07-31T16:00:00.000Z",
          habit_schedules: [{ weekday: 1 }],
          completions: [],
        },
        {
          id: "archived-with-history",
          name: "Changed schedule",
          icon: "🧭",
          color: "sun",
          display_order: 30,
          start_date: "2026-01-01",
          archived_at: "2026-07-31T16:00:00.000Z",
          habit_schedules: [{ weekday: 1 }],
          completions: [
            { id: "historical-completion", local_date: "2026-08-06" },
          ],
        },
      ],
      error: null,
    });

    const result = await getWeeklyViewModel(
      "user-123",
      "America/New_York",
      "2026-08-05T18:00:00.000Z",
    );

    expect(result.rows.map(({ id }) => id)).toEqual([
      "archived-relevant",
      "archived-with-history",
    ]);
    expect(result.rows[0]?.cells[1]).toMatchObject({ state: "incomplete" });
    expect(result.rows[0]?.cells[3]).toMatchObject({ state: "not-scheduled" });
    expect(result.rows[1]?.cells[3]).toEqual({
      completionId: "historical-completion",
      localDate: "2026-08-06",
      state: "completed",
    });
  });

  it("uses one range-bounded database request for the whole grid", async () => {
    finalOrder.mockResolvedValue({ data: [], error: null });

    const result = await getWeeklyViewModel(
      "user-123",
      "UTC",
      "2026-08-05T12:00:00.000Z",
      0,
    );

    expect(result).toEqual({
      currentLocalDate: "2026-08-05",
      endDate: "2026-08-08",
      localDates: [
        "2026-08-02",
        "2026-08-03",
        "2026-08-04",
        "2026-08-05",
        "2026-08-06",
        "2026-08-07",
        "2026-08-08",
      ],
      rows: [],
      startDate: "2026-08-02",
      status: "empty",
      timeZone: "UTC",
      weekStartsOn: 0,
    });
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("habits");
    expect(ownerEq).toHaveBeenCalledWith("owner_id", "user-123");
    expect(habitStartLte).toHaveBeenCalledWith("start_date", "2026-08-08");
    expect(completionStartGte).toHaveBeenCalledWith(
      "completions.local_date",
      "2026-08-02",
    );
    expect(completionEndLte).toHaveBeenCalledWith(
      "completions.local_date",
      "2026-08-08",
    );
    expect(firstOrder).toHaveBeenCalledWith("display_order");
    expect(finalOrder).toHaveBeenCalledWith("id");
  });

  it("returns frozen DTOs", async () => {
    finalOrder.mockResolvedValue({
      data: [
        {
          id: "habit-a",
          name: "Walk",
          icon: "🚶",
          color: "fern",
          display_order: 10,
          start_date: "2026-01-01",
          archived_at: null,
          habit_schedules: [{ weekday: 1 }],
          completions: [],
        },
      ],
      error: null,
    });

    const result = await getWeeklyViewModel(
      "user-123",
      "UTC",
      "2026-08-03T12:00:00.000Z",
    );

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.localDates)).toBe(true);
    expect(Object.isFrozen(result.rows)).toBe(true);
    expect(Object.isFrozen(result.rows[0])).toBe(true);
    expect(Object.isFrozen(result.rows[0]?.cells)).toBe(true);
    expect(Object.isFrozen(result.rows[0]?.cells[0])).toBe(true);
  });

  it("keeps query failures distinct from an empty result", async () => {
    finalOrder.mockResolvedValue({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(
      getWeeklyViewModel("user-123", "UTC", "2026-08-03T12:00:00.000Z"),
    ).rejects.toThrow("Unable to load the weekly habits.");
  });
});
