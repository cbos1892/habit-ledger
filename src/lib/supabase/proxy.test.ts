import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSupabasePublicEnv } from "./env";
import { refreshSupabaseSession } from "./proxy";
import { TIME_ZONE_COOKIE_NAME } from "../time-zone-cookie";

vi.mock("server-only", () => ({}));

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
    headers: Record<string, string>,
  ) => void;
};

const getClaims = vi.fn();
const getUser = vi.fn();
const profileSingle = vi.fn();
const profileEq = vi.fn(() => ({ single: profileSingle }));
const profileSelect = vi.fn(() => ({ eq: profileEq }));
let cookieAdapter: CookieAdapter;

describe("refreshSupabaseSession", () => {
  beforeEach(() => {
    vi.stubEnv("TIME_ZONE_COOKIE_SECRET", "");
    getClaims.mockReset();
    getUser.mockReset();
    profileSingle.mockReset();
    vi.mocked(createServerClient).mockReset();
    vi.mocked(getSupabasePublicEnv).mockReturnValue({
      publishableKey: "sb_publishable_test",
      url: "https://project.test",
    });
    vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
      cookieAdapter = options.cookies as CookieAdapter;
      return {
        auth: { getClaims, getUser },
        from: vi.fn(() => ({ select: profileSelect })),
      } as never;
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("validates claims and rotates refreshed cookies on the request and response", async () => {
    const request = new NextRequest("https://app.test/today", {
      headers: { cookie: "sb-session=old" },
    });
    getClaims.mockImplementation(async () => {
      cookieAdapter.setAll(
        [
          {
            name: "sb-session",
            options: { httpOnly: true, path: "/" },
            value: "refreshed",
          },
        ],
        {
          "Cache-Control": "private, no-store",
          Pragma: "no-cache",
        },
      );
      return { data: { claims: { sub: "user-123" } }, error: null };
    });

    const response = await refreshSupabaseSession(request);

    expect(getClaims).toHaveBeenCalledOnce();
    expect(getUser).not.toHaveBeenCalled();
    expect(request.cookies.get("sb-session")?.value).toBe("refreshed");
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Path=/");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  it("propagates expired-session cookie removal to the browser", async () => {
    const request = new NextRequest("https://app.test/week", {
      headers: { cookie: "sb-session=expired" },
    });
    getClaims.mockImplementation(async () => {
      cookieAdapter.setAll(
        [
          {
            name: "sb-session",
            options: { maxAge: 0, path: "/" },
            value: "",
          },
        ],
        {},
      );
      return {
        data: null,
        error: { code: "refresh_token_not_found" },
      };
    });

    const response = await refreshSupabaseSession(request);

    expect(getClaims).toHaveBeenCalledOnce();
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(response.headers.get("set-cookie")).toContain("sb-session=");
  });

  it("passes existing cookies to the SSR client before validation", async () => {
    const request = new NextRequest("https://app.test/sign-in", {
      headers: { cookie: "sb-session=current; preference=compact" },
    });
    getClaims.mockResolvedValue({ data: null, error: null });

    await refreshSupabaseSession(request);

    expect(cookieAdapter.getAll()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "sb-session", value: "current" }),
        expect.objectContaining({ name: "preference", value: "compact" }),
      ]),
    );
  });

  it("repairs a missing time-zone cookie from the authenticated profile", async () => {
    vi.stubEnv(
      "TIME_ZONE_COOKIE_SECRET",
      "test-secret-that-is-longer-than-thirty-two-characters",
    );
    const request = new NextRequest("https://app.test/today", {
      headers: { cookie: "sb-session=current" },
    });
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-123" } },
      error: null,
    });
    profileSingle.mockResolvedValue({
      data: { time_zone: "America/New_York" },
      error: null,
    });

    const response = await refreshSupabaseSession(request);

    expect(profileEq).toHaveBeenCalledWith("id", "user-123");
    expect(request.cookies.get(TIME_ZONE_COOKIE_NAME)?.value).toBeTruthy();
    expect(response.cookies.get(TIME_ZONE_COOKIE_NAME)?.value).toBeTruthy();
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });
});
