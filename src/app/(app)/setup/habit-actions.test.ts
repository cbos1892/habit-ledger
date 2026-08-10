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

function habitFormData(overrides: Record<string, string> = {}) {
  const data = new FormData();
  data.set("name", overrides.name ?? "Morning walk");
  data.set("icon", overrides.icon ?? "🌿");
  data.set("color", overrides.color ?? "fern");
  data.set("startDate", overrides.startDate ?? "2026-08-10");
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
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { display_order: 3 }, error: null });
    const orderQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle,
    };
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi
      .fn()
      .mockReturnValueOnce(orderQuery)
      .mockReturnValueOnce({ insert });
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ from } as never);

    await expect(
      createHabit({ status: "idle" }, habitFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(insert).toHaveBeenCalledWith({
      owner_id: "user-123",
      name: "Morning walk",
      icon: "🌿",
      color: "fern",
      start_date: "2026-08-10",
      display_order: 4,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/setup");
    expect(redirect).toHaveBeenCalledWith("/setup?habit=created");
  });

  it("updates only an active habit belonging to the authenticated owner", async () => {
    const query = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { id: "habit-123" }, error: null }),
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      from: vi.fn(() => query),
    } as never);

    await expect(
      updateHabit("habit-123", { status: "idle" }, habitFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(query.update).toHaveBeenCalledWith({
      name: "Morning walk",
      icon: "🌿",
      color: "fern",
      start_date: "2026-08-10",
    });
    expect(query.eq).toHaveBeenNthCalledWith(1, "id", "habit-123");
    expect(query.eq).toHaveBeenNthCalledWith(2, "owner_id", "user-123");
    expect(query.is).toHaveBeenCalledWith("archived_at", null);
    expect(redirect).toHaveBeenCalledWith("/setup?habit=updated");
  });

  it("keeps submitted values available when persistence fails", async () => {
    const query = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: "unavailable" } }),
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      from: vi.fn(() => query),
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
