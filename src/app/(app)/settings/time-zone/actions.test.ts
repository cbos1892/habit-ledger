import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { updateWeekStart } from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/current-user", () => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const eq = vi.fn();
const update = vi.fn(() => ({ eq }));

function formData(value: string) {
  const data = new FormData();
  data.set("weekStartsOn", value);
  return data;
}

describe("week-start update action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue({ id: "user-123" });
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      from: vi.fn(() => ({ update })),
    } as never);
  });

  it.each(["-1", "2", "monday", ""])(
    "rejects invalid value %s before loading private data",
    async (value) => {
      const result = await updateWeekStart({ status: "idle" }, formData(value));

      expect(result).toMatchObject({
        status: "error",
        weekStartError: expect.stringContaining("Monday"),
      });
      expect(requireCurrentUser).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["0", 0],
    ["1", 1],
  ] as const)(
    "stores supported value %s for the current user",
    async (raw, value) => {
      eq.mockResolvedValue({ error: null });

      await expect(
        updateWeekStart({ status: "idle" }, formData(raw)),
      ).resolves.toEqual({ status: "saved", weekStartsOn: value });
      expect(update).toHaveBeenCalledWith({ week_starts_on: value });
      expect(eq).toHaveBeenCalledWith("id", "user-123");
      expect(revalidatePath).toHaveBeenCalledWith("/week");
    },
  );

  it("returns a retryable error when persistence fails", async () => {
    eq.mockResolvedValue({ error: { message: "database unavailable" } });

    await expect(
      updateWeekStart({ status: "idle" }, formData("0")),
    ).resolves.toEqual({
      status: "error",
      message:
        "We couldn't save your week layout right now. Wait a moment and try again.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
