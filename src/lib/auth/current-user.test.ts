import { beforeEach, describe, expect, it, vi } from "vitest";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { getCurrentUser, requireCurrentUser } from "./current-user";

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

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const getUser = vi.fn();

describe("current user access", () => {
  beforeEach(() => {
    getUser.mockReset();
    vi.mocked(redirect).mockClear();
    vi.mocked(createServerSupabaseClient).mockReset();
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser },
    } as never);
  });

  it("returns only the authenticated identity needed by server data access", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "private@example.com",
          app_metadata: { role: "authenticated" },
        },
      },
      error: null,
    });

    const user = await getCurrentUser();

    expect(user).toEqual({ id: "user-123" });
    expect(user).not.toHaveProperty("email");
    expect(Object.isFrozen(user)).toBe(true);
  });

  it("redirects anonymous users before private data can be requested", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(requireCurrentUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("treats expired sessions as anonymous and redirects safely", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { code: "refresh_token_not_found", message: "expired" },
    });

    await expect(requireCurrentUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("fails closed when the authentication service cannot be reached", async () => {
    getUser.mockRejectedValue(new Error("network unavailable"));

    await expect(requireCurrentUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });
});
