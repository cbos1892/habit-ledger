import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { getSetupViewModel } from "./habits";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const routineFinalOrder = vi.fn();
const routineFirstOrder = vi.fn(() => ({ order: routineFinalOrder }));
const routineOwnerEq = vi.fn(() => ({ order: routineFirstOrder }));
const routineSelect = vi.fn(() => ({ eq: routineOwnerEq }));

const habitFinalOrder = vi.fn();
const habitFirstOrder = vi.fn(() => ({ order: habitFinalOrder }));
const habitOwnerEq = vi.fn(() => ({ order: habitFirstOrder }));
const habitSelect = vi.fn(() => ({ eq: habitOwnerEq }));

const from = vi.fn((table: string) =>
  table === "routines" ? { select: routineSelect } : { select: habitSelect },
);

describe("Setup routine view model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ from } as never);
  });

  it("loads owner-scoped routines plus active and archived habits in one model", async () => {
    routineFinalOrder.mockResolvedValue({
      data: [{ id: "routine-a", name: "Morning", display_order: 0 }],
      error: null,
    });
    habitFinalOrder.mockResolvedValue({
      data: [
        {
          archived_at: null,
          color: "fern",
          display_order: 0,
          habit_schedules: [{ weekday: 1 }],
          icon: "🚶",
          id: "standalone",
          name: "Walk",
          routine_display_order: null,
          routine_id: null,
          start_date: "2026-08-01",
        },
        {
          archived_at: "2026-08-10T12:00:00.000Z",
          color: "plum",
          display_order: 1,
          habit_schedules: [{ weekday: 2 }],
          icon: "📚",
          id: "routine-archived",
          name: "Read",
          routine_display_order: 0,
          routine_id: "routine-a",
          start_date: "2026-08-01",
        },
      ],
      error: null,
    });

    const result = await getSetupViewModel("owner-123");

    expect(result.sections).toEqual([
      {
        activeHabits: [expect.objectContaining({ id: "standalone" })],
        archivedHabits: [],
        kind: "standalone",
      },
      {
        activeHabits: [],
        archivedHabits: [
          expect.objectContaining({ id: "routine-archived", weekdays: [2] }),
        ],
        kind: "routine",
        routine: { displayOrder: 0, id: "routine-a", name: "Morning" },
      },
    ]);
    expect(routineOwnerEq).toHaveBeenCalledWith("owner_id", "owner-123");
    expect(habitOwnerEq).toHaveBeenCalledWith("owner_id", "owner-123");
  });

  it("keeps query failures distinct from an empty Setup", async () => {
    routineFinalOrder.mockResolvedValue({ data: null, error: null });
    habitFinalOrder.mockResolvedValue({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(getSetupViewModel("owner-123")).rejects.toThrow(
      "Unable to load habit setup.",
    );
  });
});
