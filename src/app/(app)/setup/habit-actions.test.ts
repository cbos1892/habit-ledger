import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { createHabit, updateHabit } from "./habit-actions";

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

    expect(rpc).toHaveBeenCalledWith("create_habit_with_schedule", {
      p_color: "fern",
      p_icon: "🌿",
      p_name: "Morning walk",
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

    expect(rpc).toHaveBeenCalledWith("update_habit_with_schedule", {
      p_color: "fern",
      p_habit_id: "habit-123",
      p_icon: "🌿",
      p_name: "Morning walk",
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
});
