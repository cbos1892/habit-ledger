import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSupabasePublicEnv } from "./env";
import { refreshSupabaseSession } from "./proxy";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("./env", () => ({
  getSupabasePublicEnv: vi.fn(),
}));

type CookieAdapter = {
  getAll: () => { name: string; value: string }[];
  setAll: (
    cookies: {
      name: string;
      options: { httpOnly?: boolean; maxAge?: number; path?: string };
      value: string;
    }[],
  ) => void;
};

const getUser = vi.fn();
let cookieAdapter: CookieAdapter;

describe("refreshSupabaseSession", () => {
  beforeEach(() => {
    getUser.mockReset();
    vi.mocked(createServerClient).mockReset();
    vi.mocked(getSupabasePublicEnv).mockReturnValue({
      publishableKey: "sb_publishable_test",
      url: "https://project.test",
    });
    vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
      cookieAdapter = options.cookies as CookieAdapter;
      return { auth: { getUser } } as never;
    });
  });

  it("validates the user and rotates refreshed cookies on the request and response", async () => {
    const request = new NextRequest("https://app.test/today", {
      headers: { cookie: "sb-session=old" },
    });
    getUser.mockImplementation(async () => {
      cookieAdapter.setAll([
        {
          name: "sb-session",
          options: { httpOnly: true, path: "/" },
          value: "refreshed",
        },
      ]);
      return { data: { user: { id: "user-123" } }, error: null };
    });

    const response = await refreshSupabaseSession(request);

    expect(getUser).toHaveBeenCalledOnce();
    expect(request.cookies.get("sb-session")?.value).toBe("refreshed");
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Path=/");
  });

  it("propagates expired-session cookie removal to the browser", async () => {
    const request = new NextRequest("https://app.test/week", {
      headers: { cookie: "sb-session=expired" },
    });
    getUser.mockImplementation(async () => {
      cookieAdapter.setAll([
        {
          name: "sb-session",
          options: { maxAge: 0, path: "/" },
          value: "",
        },
      ]);
      return {
        data: { user: null },
        error: { code: "refresh_token_not_found" },
      };
    });

    const response = await refreshSupabaseSession(request);

    expect(getUser).toHaveBeenCalledOnce();
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(response.headers.get("set-cookie")).toContain("sb-session=");
  });

  it("passes existing cookies to the SSR client before validation", async () => {
    const request = new NextRequest("https://app.test/sign-in", {
      headers: { cookie: "sb-session=current; preference=compact" },
    });
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await refreshSupabaseSession(request);

    expect(cookieAdapter.getAll()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "sb-session", value: "current" }),
        expect.objectContaining({ name: "preference", value: "compact" }),
      ]),
    );
  });
});
