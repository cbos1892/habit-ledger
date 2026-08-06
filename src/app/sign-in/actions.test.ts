import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { signInWithGoogle } from "./actions";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const signInWithOAuth = vi.fn();

describe("signInWithGoogle", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
    vi.mocked(headers).mockReset();
    vi.mocked(redirect).mockReset();
    vi.mocked(createServerSupabaseClient).mockReset();

    vi.mocked(headers).mockResolvedValue(
      new Headers({ origin: "https://habitledger.vercel.app" }),
    );
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { signInWithOAuth },
    } as never);
  });

  it("starts Google OAuth with the application callback and redirects", async () => {
    signInWithOAuth.mockResolvedValue({
      data: {
        url: "https://accounts.google.com/oauth/authorize?client_id=test",
      },
      error: null,
    });

    const result = await signInWithGoogle({ status: "idle" }, new FormData());

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://habitledger.vercel.app/auth/callback?next=/today",
      },
    });
    expect(redirect).toHaveBeenCalledWith(
      "https://accounts.google.com/oauth/authorize?client_id=test",
    );
    expect(result).toBeUndefined();
  });

  it("returns a recoverable error when Supabase cannot start OAuth", async () => {
    signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: new Error("provider disabled"),
    });

    await expect(
      signInWithGoogle({ status: "idle" }, new FormData()),
    ).resolves.toEqual({
      status: "error",
      message:
        "We couldn't start Google sign-in right now. Try again in a moment.",
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});
