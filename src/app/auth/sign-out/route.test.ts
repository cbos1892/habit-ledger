import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const signOut = vi.fn();

describe("POST /auth/sign-out", () => {
  beforeEach(() => {
    signOut.mockReset();
    signOut.mockResolvedValue({ error: null });
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { signOut },
    } as never);
  });

  it("clears the local session and returns to sign in", async () => {
    const response = await POST(
      new Request("https://app.test/auth/sign-out", { method: "POST" }),
    );

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://app.test/sign-in");
  });
});
