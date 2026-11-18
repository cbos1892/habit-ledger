import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCurrentUser } from "@/lib/auth/current-user";

import SignInPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("./magic-link-form", () => ({
  MagicLinkForm: () => null,
}));

describe("sign-in page session handling", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(redirect).mockClear();
  });

  it("redirects an authenticated user to the app without rendering sign-in", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-123" });

    await expect(
      SignInPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/today");
  });

  it("renders sign-in for an anonymous user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await SignInPage({
      searchParams: Promise.resolve({ error: "invalid_or_expired" }),
    });

    expect(result.type).toBe("main");
    expect(redirect).not.toHaveBeenCalled();
  });
});
