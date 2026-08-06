import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const exchangeCodeForSession = vi.fn();

describe("GET /auth/callback", () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { exchangeCodeForSession },
    } as never);
  });

  it("exchanges the code and redirects to an allowed destination", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await GET(
      new Request("https://app.test/auth/callback?code=abc&next=/week"),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(response.headers.get("location")).toBe("https://app.test/week");
  });

  it("does not redirect to an external destination", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await GET(
      new Request(
        "https://app.test/auth/callback?code=abc&next=https://evil.test",
      ),
    );

    expect(response.headers.get("location")).toBe("https://app.test/today");
  });

  it("returns a recoverable error for missing or invalid codes", async () => {
    const missingResponse = await GET(
      new Request("https://app.test/auth/callback"),
    );
    expect(missingResponse.headers.get("location")).toBe(
      "https://app.test/sign-in?error=invalid_or_expired",
    );

    exchangeCodeForSession.mockResolvedValue({ error: new Error("expired") });
    const expiredResponse = await GET(
      new Request("https://app.test/auth/callback?code=expired"),
    );
    expect(expiredResponse.headers.get("location")).toBe(
      "https://app.test/sign-in?error=invalid_or_expired",
    );
  });

  it("returns a Google-specific error when the provider rejects the request", async () => {
    const response = await GET(
      new Request(
        "https://app.test/auth/callback?error=access_denied&error_description=cancelled",
      ),
    );

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://app.test/sign-in?error=oauth_failed",
    );
  });
});
