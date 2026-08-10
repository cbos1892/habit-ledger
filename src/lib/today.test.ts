import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { getTodayViewModel } from "./today";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const finalOrder = vi.fn();
const firstOrder = vi.fn(() => ({ order: finalOrder }));
const completionDateEq = vi.fn(() => ({ order: firstOrder }));
const archivedIs = vi.fn(() => ({ eq: completionDateEq }));
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
      habits: [
        {
          id: "habit-a",
          name: "Morning walk",
          icon: "🚶",
          color: "fern",
          completed: true,
          completionId: "completion-a",
          displayOrder: 10,
        },
        {
          id: "habit-c",
          name: "Evening stretch",
          icon: "🧘",
          color: "sun",
          completed: false,
          completionId: null,
          displayOrder: 30,
        },
      ],
      localDate: "2026-08-10",
      status: "ready",
      timeZone: "America/New_York",
      totalCount: 2,
    });
    expect(ownerEq).toHaveBeenCalledWith("owner_id", "user-123");
    expect(archivedIs).toHaveBeenCalledWith("archived_at", null);
    expect(completionDateEq).toHaveBeenCalledWith(
      "completions.local_date",
      "2026-08-10",
    );
    expect(firstOrder).toHaveBeenCalledWith("display_order");
    expect(finalOrder).toHaveBeenCalledWith("id");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.habits)).toBe(true);
  });

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
      habits: [],
      localDate: "2026-08-10",
      status: "empty",
      timeZone: "UTC",
      totalCount: 0,
    });
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
