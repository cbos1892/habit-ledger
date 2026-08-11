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

const getClaims = vi.fn();
const getUser = vi.fn();

describe("current user access", () => {
  beforeEach(() => {
    getClaims.mockReset();
    getUser.mockReset();
    vi.mocked(redirect).mockClear();
    vi.mocked(createServerSupabaseClient).mockReset();
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getClaims, getUser },
    } as never);
  });

  it("returns only the stable identity from verified JWT claims", async () => {
    getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: "user-123",
          email: "private@example.com",
          app_metadata: { role: "authenticated" },
        },
      },
      error: null,
    });

    const user = await getCurrentUser();

    expect(getClaims).toHaveBeenCalledOnce();
    expect(getUser).not.toHaveBeenCalled();
    expect(user).toEqual({ id: "user-123" });
    expect(user).not.toHaveProperty("email");
    expect(Object.isFrozen(user)).toBe(true);
  });

  it("redirects when the request has no authenticated token", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });

    await expect(requireCurrentUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });

  it.each([
    ["expired", { code: "bad_jwt", message: "JWT has expired" }],
    ["malformed", { code: "bad_jwt", message: "Invalid JWT structure" }],
    ["spoofed", { code: "bad_jwt", message: "Invalid JWT signature" }],
  ])("fails closed for a %s token", async (_case, error) => {
    getClaims.mockResolvedValue({ data: null, error });

    await expect(requireCurrentUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("fails closed when claims cannot be verified", async () => {
    getClaims.mockRejectedValue(new Error("JWKS unavailable"));

    await expect(requireCurrentUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });
});
