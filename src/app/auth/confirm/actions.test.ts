import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { confirmMagicLink } from "./actions";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((destination: string) => {
    throw new Error(destination);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const verifyOtp = vi.fn();
const invalidLink = "/sign-in?error=invalid_or_expired";

describe("confirmMagicLink", () => {
  beforeEach(() => {
    verifyOtp.mockReset();
    vi.mocked(redirect).mockClear();
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { verifyOtp },
    } as never);
  });

  it("verifies the email token without a PKCE code and redirects to Today", async () => {
    verifyOtp.mockResolvedValue({ error: null });
    const form = new FormData();
    form.set("token_hash", "email-token-hash");

    await expect(confirmMagicLink(form)).rejects.toThrow("/today");
    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: "email-token-hash",
      type: "email",
    });
  });

  it("returns to sign-in when the link has already been used or expired", async () => {
    verifyOtp.mockResolvedValue({ error: new Error("OTP expired") });
    const form = new FormData();
    form.set("token_hash", "expired-token-hash");

    await expect(confirmMagicLink(form)).rejects.toThrow(invalidLink);
  });

  it("rejects a missing token without calling Supabase", async () => {
    await expect(confirmMagicLink(new FormData())).rejects.toThrow(invalidLink);
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});
