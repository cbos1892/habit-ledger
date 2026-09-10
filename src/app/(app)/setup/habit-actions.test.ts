import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  archiveHabit,
  createHabit,
  createRoutine,
  deleteRoutine,
  moveHabit,
  moveRoutine,
  moveRoutineHabit,
  renameRoutine,
  restoreHabit,
  setHabitRoutine,
  updateHabit,
} from "./habit-actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/auth/current-user", () => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

function habitFormData(
  overrides: Record<string, string> & { weekdays?: string[] } = {},
) {
  const data = new FormData();
  data.set("name", overrides.name ?? "Morning walk");
  data.set("icon", overrides.icon ?? "🌿");
  data.set("color", overrides.color ?? "fern");
  data.set("routineId", overrides.routineId ?? "");
  data.set("startDate", overrides.startDate ?? "2026-08-10");
  for (const weekday of overrides.weekdays ?? [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
  ]) {
    data.append("weekdays", weekday);
  }
  return data;
}

function managementFormData(habitId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa") {
  const data = new FormData();
  data.set("habitId", habitId);
  return data;
}

describe("habit form actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue({ id: "user-123" });
  });

  it("returns entered values and field errors before authentication", async () => {
    const result = await createHabit(
      { status: "idle" },
      habitFormData({ name: "", color: "invalid" }),
    );

    expect(result).toMatchObject({
      status: "error",
      errors: { name: expect.any(String), color: expect.any(String) },
      values: { name: "", color: "invalid" },
    });
    expect(requireCurrentUser).not.toHaveBeenCalled();
  });

  it("creates a habit for the authenticated owner and returns to Setup", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "habit-123", error: null });
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ rpc } as never);

    await expect(
      createHabit({ status: "idle" }, habitFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(rpc).toHaveBeenCalledWith("create_habit_with_schedule_and_routine", {
      p_color: "fern",
      p_icon: "🌿",
      p_name: "Morning walk",
      p_routine_id: null,
      p_start_date: "2026-08-10",
      p_weekdays: [1, 2, 3, 4, 5, 6, 7],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/setup");
    expect(redirect).toHaveBeenCalledWith("/setup?habit=created");
  });

  it("updates only an active habit belonging to the authenticated owner", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "habit-123", error: null });
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      rpc,
    } as never);

    await expect(
      updateHabit("habit-123", { status: "idle" }, habitFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(rpc).toHaveBeenCalledWith("update_habit_with_schedule_and_routine", {
      p_color: "fern",
      p_habit_id: "habit-123",
      p_icon: "🌿",
      p_name: "Morning walk",
      p_routine_id: null,
      p_start_date: "2026-08-10",
      p_weekdays: [1, 2, 3, 4, 5, 6, 7],
    });
    expect(redirect).toHaveBeenCalledWith("/setup?habit=updated");
  });

  it("keeps submitted values available when persistence fails", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      rpc: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: "unavailable" } }),
    } as never);

    const result = await updateHabit(
      "habit-123",
      { status: "idle" },
      habitFormData({ name: "Evening walk" }),
    );

    expect(result).toMatchObject({
      status: "error",
      message: expect.stringContaining("changes are still here"),
      values: { name: "Evening walk" },
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("moves an owned habit and refreshes every ordered active view", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "habit-123", error: null });
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ rpc } as never);
    const data = managementFormData();
    data.set("direction", "up");

    await expect(moveHabit(data)).rejects.toThrow("NEXT_REDIRECT");

    expect(rpc).toHaveBeenCalledWith("move_standalone_habit", {
      p_direction: "up",
      p_habit_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/setup");
    expect(revalidatePath).toHaveBeenCalledWith("/today");
    expect(revalidatePath).toHaveBeenCalledWith("/week");
    expect(redirect).toHaveBeenCalledWith("/setup?habit=moved");
  });

  it("creates and renames duplicate-friendly named routines", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "routine-123", error: null });
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ rpc } as never);
    const data = new FormData();
    data.set("name", "Morning");

    await expect(createRoutine({ status: "idle" }, data)).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(rpc).toHaveBeenCalledWith("create_routine", {
      p_icon: "◌",
      p_name: "Morning",
    });

    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue({ id: "user-123" });
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ rpc } as never);
    await expect(
      renameRoutine("routine-123", { status: "idle" }, data),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(rpc).toHaveBeenCalledWith("rename_routine", {
      p_icon: "◌",
      p_name: "Morning",
      p_routine_id: "routine-123",
    });
  });

  it("returns routine names when validation or persistence fails", async () => {
    const empty = new FormData();
    empty.set("name", " ");
    expect(await createRoutine({ status: "idle" }, empty)).toMatchObject({
      status: "error",
      errors: { name: expect.any(String) },
      values: { icon: "◌", name: "" },
    });

    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "no" } }),
    } as never);
    const named = new FormData();
    named.set("name", "Evening reset");
    expect(await createRoutine({ status: "idle" }, named)).toMatchObject({
      status: "error",
      values: { name: "Evening reset" },
    });
  });

  it("routes routine and membership controls through owner-scoped RPCs", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "ok", error: null });
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ rpc } as never);
    const data = managementFormData();
    data.set("routineId", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    data.set("direction", "down");

    await expect(moveRoutine(data)).rejects.toThrow("NEXT_REDIRECT");
    expect(rpc).toHaveBeenCalledWith("move_routine", {
      p_direction: "down",
      p_routine_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    await expect(moveRoutineHabit(data)).rejects.toThrow("NEXT_REDIRECT");
    expect(rpc).toHaveBeenCalledWith("move_habit_in_routine", {
      p_direction: "down",
      p_habit_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });

    await expect(setHabitRoutine(data)).rejects.toThrow("NEXT_REDIRECT");
    expect(rpc).toHaveBeenCalledWith("assign_habit_to_routine", {
      p_habit_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      p_routine_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    await expect(deleteRoutine(data)).rejects.toThrow("NEXT_REDIRECT");
    expect(rpc).toHaveBeenCalledWith("delete_routine", {
      p_routine_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
  });

  it("returns to Setup with clear rollback feedback when a membership move fails", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "no" } }),
    } as never);
    const data = managementFormData();
    data.set("routineId", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");

    await expect(setHabitRoutine(data)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/setup?routine=membership-error");
  });

  it("archives and restores only the identified owned habit", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "habit-123", error: null });
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ rpc } as never);

    await expect(archiveHabit(managementFormData())).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(rpc).toHaveBeenCalledWith("archive_habit", {
      p_habit_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });

    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue({ id: "user-123" });
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ rpc } as never);

    await expect(restoreHabit(managementFormData())).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(rpc).toHaveBeenCalledWith("restore_habit", {
      p_habit_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    expect(redirect).toHaveBeenCalledWith("/setup?habit=restored");
  });

  it("rejects malformed management inputs before persistence", async () => {
    const invalidId = managementFormData("not-a-habit-id");
    const invalidDirection = managementFormData();
    invalidDirection.set("direction", "sideways");

    await expect(archiveHabit(invalidId)).rejects.toThrow("Invalid habit");
    await expect(moveHabit(invalidDirection)).rejects.toThrow(
      "Invalid move direction",
    );
    expect(requireCurrentUser).not.toHaveBeenCalled();
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });
});
