import { beforeEach, describe, expect, it, vi } from "vitest";

import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { getProfile, requireConfiguredProfile } from "./profile";

vi.mock("server-only", () => ({}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T extends (...arguments_: never[]) => unknown>(callback: T) =>
    callback,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/auth/current-user", () => ({
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const single = vi.fn();
const eq = vi.fn(() => ({ single }));
const select = vi.fn(() => ({ eq }));

describe("profile access", () => {
  beforeEach(() => {
    single.mockReset();
    eq.mockClear();
    select.mockClear();
    vi.mocked(redirect).mockClear();
    vi.mocked(requireCurrentUser).mockReset();
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      from: vi.fn(() => ({ select })),
    } as never);
  });

  it("loads only calendar settings for the requested owner", async () => {
    single.mockResolvedValue({
      data: {
        id: "user-123",
        time_zone: "America/New_York",
        time_zone_confirmed_at: "2026-08-06T20:00:00.000Z",
      },
      error: null,
    });

    const profile = await getProfile("user-123");

    expect(select).toHaveBeenCalledWith(
      "id, time_zone, time_zone_confirmed_at",
    );
    expect(eq).toHaveBeenCalledWith("id", "user-123");
    expect(Object.isFrozen(profile)).toBe(true);
  });

  it("redirects an unconfigured user to first-run setup", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue({ id: "user-123" });
    single.mockResolvedValue({
      data: {
        id: "user-123",
        time_zone: "UTC",
        time_zone_confirmed_at: null,
      },
      error: null,
    });

    await expect(requireConfiguredProfile()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/setup");
  });
});
