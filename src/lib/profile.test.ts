import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readTimeZoneCookieValue } from "@/lib/time-zone-cookie";

import {
  getCurrentProfile,
  getCurrentTimeZoneContext,
  getProfile,
  requireTimeZoneContext,
} from "./profile";

vi.mock("server-only", () => ({}));

const cacheStores = vi.hoisted(() => new Set<Map<string, unknown>>());

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T extends (...arguments_: never[]) => unknown>(callback: T): T => {
    const results = new Map<string, unknown>();
    cacheStores.add(results);

    return ((...arguments_: Parameters<T>) => {
      const key = JSON.stringify(arguments_);

      if (!results.has(key)) results.set(key, callback(...arguments_));

      return results.get(key);
    }) as T;
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => ({ value: "signed-cookie" })),
  })),
}));

vi.mock("@/lib/auth/current-user", () => ({
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/time-zone-cookie", () => ({
  readTimeZoneCookieValue: vi.fn(),
  TIME_ZONE_COOKIE_NAME: "habit-ledger-time-zone",
}));

const single = vi.fn();
const eq = vi.fn(() => ({ single }));
const select = vi.fn(() => ({ eq }));

describe("profile access", () => {
  beforeEach(() => {
    cacheStores.forEach((store) => store.clear());
    single.mockReset();
    eq.mockClear();
    select.mockClear();
    vi.mocked(requireCurrentUser).mockReset();
    vi.mocked(readTimeZoneCookieValue).mockReset();
    vi.mocked(readTimeZoneCookieValue).mockResolvedValue(null);
    vi.mocked(createServerSupabaseClient).mockReset();
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      from: vi.fn(() => ({ select })),
    } as never);
  });

  it("loads only calendar settings for the requested owner", async () => {
    single.mockResolvedValue({
      data: {
        id: "user-123",
        time_zone: "America/New_York",
        time_zone_confirmed_at: "2026-08-06T20:00:00.000Z",
        time_zone_source: "automatic",
        week_starts_on: 1,
      },
      error: null,
    });

    const profile = await getProfile("user-123");

    expect(select).toHaveBeenCalledWith(
      "id, time_zone, time_zone_confirmed_at, time_zone_source, week_starts_on",
    );
    expect(eq).toHaveBeenCalledWith("id", "user-123");
    expect(Object.isFrozen(profile)).toBe(true);
  });

  it("loads the current user's profile through the request-scoped accessor", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue({ id: "user-123" });
    single.mockResolvedValue({
      data: {
        id: "user-123",
        time_zone: "America/New_York",
        time_zone_confirmed_at: "2026-08-06T20:00:00.000Z",
        time_zone_source: "automatic",
        week_starts_on: 1,
      },
      error: null,
    });

    await expect(getCurrentProfile()).resolves.toMatchObject({
      id: "user-123",
      time_zone: "America/New_York",
    });
    expect(requireCurrentUser).toHaveBeenCalledOnce();
    expect(eq).toHaveBeenCalledWith("id", "user-123");
  });

  it("deduplicates profile fallback across the route boundary and page", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue({ id: "user-123" });
    single.mockResolvedValue({
      data: {
        id: "user-123",
        time_zone: "America/New_York",
        time_zone_confirmed_at: "2026-08-06T20:00:00.000Z",
        time_zone_source: "automatic",
        week_starts_on: 1,
      },
      error: null,
    });

    const [pageProfile, context] = await Promise.all([
      getCurrentProfile(),
      requireTimeZoneContext(),
    ]);

    expect(context).toEqual({
      id: pageProfile.id,
      time_zone: pageProfile.time_zone,
    });
    expect(requireCurrentUser).toHaveBeenCalledTimes(2);
    expect(createServerSupabaseClient).toHaveBeenCalledOnce();
    expect(single).toHaveBeenCalledOnce();
  });

  it("lets an unconfirmed user continue with the profile fallback", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue({ id: "user-123" });
    single.mockResolvedValue({
      data: {
        id: "user-123",
        time_zone: "UTC",
        time_zone_confirmed_at: null,
        time_zone_source: "automatic",
        week_starts_on: 1,
      },
      error: null,
    });

    await expect(requireTimeZoneContext()).resolves.toEqual({
      id: "user-123",
      time_zone: "UTC",
    });
  });

  it("uses a valid user-bound cookie without querying the profile", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue({ id: "user-123" });
    vi.mocked(readTimeZoneCookieValue).mockResolvedValue("America/Chicago");

    await expect(getCurrentTimeZoneContext()).resolves.toEqual({
      id: "user-123",
      time_zone: "America/Chicago",
    });
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("rejects an invalid persisted week-start value", async () => {
    single.mockResolvedValue({
      data: {
        id: "user-123",
        time_zone: "UTC",
        time_zone_confirmed_at: null,
        time_zone_source: "automatic",
        week_starts_on: 2,
      },
      error: null,
    });

    await expect(getProfile("user-123")).rejects.toThrow(
      "Unable to load the current user's profile.",
    );
  });
});
