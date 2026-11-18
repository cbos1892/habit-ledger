import { headers } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { requestMagicLink } from "./actions";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const signInWithOtp = vi.fn();

describe("requestMagicLink", () => {
  beforeEach(() => {
    signInWithOtp.mockReset();

    vi.mocked(headers).mockResolvedValue(
      new Headers({ origin: "https://habitledger.curtisbos.com" }),
    );
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { signInWithOtp },
    } as never);
  });

  it("requests a one-time email for the supplied address", async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    const form = new FormData();
    form.set("email", " user@example.com ");

    await expect(requestMagicLink({ status: "idle" }, form)).resolves.toEqual({
      status: "sent",
    });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      options: {
        emailRedirectTo:
          "https://habitledger.curtisbos.com/auth/callback?next=/today",
      },
    });
  });

  it("returns recoverable feedback if sending fails", async () => {
    signInWithOtp.mockResolvedValue({ error: new Error("SMTP unavailable") });
    const form = new FormData();
    form.set("email", "user@example.com");

    await expect(requestMagicLink({ status: "idle" }, form)).resolves.toEqual({
      status: "error",
      message:
        "We couldn't send a sign-in link right now. Wait a moment and try again.",
    });
  });
});
