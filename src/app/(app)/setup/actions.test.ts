import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createTimeZoneCookieValue } from "@/lib/time-zone-cookie";

import { updateTimeZone } from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const setCookie = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: setCookie })),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/current-user", () => ({
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/time-zone-cookie", () => ({
  createTimeZoneCookieValue: vi.fn(),
  TIME_ZONE_COOKIE_NAME: "habit-ledger-time-zone",
  timeZoneCookieOptions: { httpOnly: true, path: "/" },
}));

const eq = vi.fn();
const update = vi.fn(() => ({ eq }));

function formData(timeZone: string) {
  const data = new FormData();
  data.set("timeZone", timeZone);
  return data;
}

describe("time-zone update action", () => {
  beforeEach(() => {
    eq.mockReset();
    update.mockClear();
    vi.mocked(revalidatePath).mockClear();
    setCookie.mockReset();
    vi.mocked(cookies).mockClear();
    vi.mocked(createTimeZoneCookieValue).mockReset();
    vi.mocked(createTimeZoneCookieValue).mockResolvedValue("signed-cookie");
    vi.mocked(requireCurrentUser).mockReset();
    vi.mocked(requireCurrentUser).mockResolvedValue({ id: "user-123" });
    vi.mocked(createServerSupabaseClient).mockReset();
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      from: vi.fn(() => ({ update })),
    } as never);
  });

  it("rejects unsupported values before requesting private data", async () => {
    const result = await updateTimeZone(
      { status: "idle" },
      formData("Not/A_Time_Zone"),
    );

    expect(result).toMatchObject({
      status: "error",
      timeZoneError: expect.stringContaining("IANA"),
    });
    expect(requireCurrentUser).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("updates only the authenticated user's profile", async () => {
    eq.mockResolvedValue({ error: null });

    const result = await updateTimeZone(
      { status: "idle" },
      formData(" America/New_York "),
    );

    expect(update).toHaveBeenCalledWith({
      time_zone: "America/New_York",
      time_zone_confirmed_at: expect.any(String),
      time_zone_source: "manual",
    });
    expect(eq).toHaveBeenCalledWith("id", "user-123");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(setCookie).toHaveBeenCalledWith(
      "habit-ledger-time-zone",
      "signed-cookie",
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
    expect(result).toEqual({
      status: "saved",
      timeZone: "America/New_York",
    });
  });

  it("returns a safe retry message when persistence fails", async () => {
    eq.mockResolvedValue({ error: { message: "database unavailable" } });

    const result = await updateTimeZone(
      { status: "idle" },
      formData("Europe/London"),
    );

    expect(result).toEqual({
      status: "error",
      message:
        "We couldn't save your time zone right now. Wait a moment and try again.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
