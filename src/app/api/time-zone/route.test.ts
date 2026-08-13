import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCurrentUser } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createTimeZoneCookieValue } from "@/lib/time-zone-cookie";

import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/current-user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));
vi.mock("@/lib/time-zone-cookie", () => ({
  createTimeZoneCookieValue: vi.fn(),
  TIME_ZONE_COOKIE_NAME: "habit-ledger-time-zone",
  timeZoneCookieOptions: { httpOnly: true, path: "/", sameSite: "lax" },
}));

const single = vi.fn();
const readEq = vi.fn(() => ({ single }));
const select = vi.fn(() => ({ eq: readEq }));
const updateEq = vi.fn();
const update = vi.fn(() => ({ eq: updateEq }));

function request(timeZone: unknown) {
  return new Request("https://app.test/api/time-zone", {
    body: JSON.stringify({ timeZone }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

describe("POST /api/time-zone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-123" });
    vi.mocked(createTimeZoneCookieValue).mockResolvedValue("signed-cookie");
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      from: vi.fn(() => ({ select, update })),
    } as never);
  });

  it("requires verified authentication before accepting browser context", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const response = await POST(request("America/New_York"));

    expect(response.status).toBe(401);
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("validates detected values before loading or updating a profile", async () => {
    const response = await POST(request("Not/A_Time_Zone"));

    expect(response.status).toBe(400);
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("synchronizes an automatic profile and issues a user-bound cookie", async () => {
    single.mockResolvedValue({
      data: {
        time_zone: "UTC",
        time_zone_confirmed_at: null,
        time_zone_source: "automatic",
      },
      error: null,
    });
    updateEq.mockResolvedValue({ error: null });

    const response = await POST(request("America/New_York"));

    expect(update).toHaveBeenCalledWith({
      time_zone: "America/New_York",
      time_zone_confirmed_at: expect.any(String),
      time_zone_source: "automatic",
    });
    expect(updateEq).toHaveBeenCalledWith("id", "user-123");
    expect(createTimeZoneCookieValue).toHaveBeenCalledWith(
      "user-123",
      "America/New_York",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "habit-ledger-time-zone=signed-cookie",
    );
    await expect(response.json()).resolves.toEqual({
      result: "synchronized",
      timeZone: "America/New_York",
    });
  });

  it("preserves a prior manual choice when the browser zone changes", async () => {
    single.mockResolvedValue({
      data: {
        time_zone: "America/Chicago",
        time_zone_confirmed_at: "2026-08-01T12:00:00.000Z",
        time_zone_source: "manual",
      },
      error: null,
    });

    const response = await POST(request("America/Los_Angeles"));

    expect(update).not.toHaveBeenCalled();
    expect(createTimeZoneCookieValue).toHaveBeenCalledWith(
      "user-123",
      "America/Chicago",
    );
    await expect(response.json()).resolves.toEqual({
      result: "preserved-manual",
      timeZone: "America/Chicago",
    });
  });
});
