import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTimeZoneCookieValue,
  readTimeZoneCookieValue,
} from "./time-zone-cookie";

vi.mock("server-only", () => ({}));

const secret = "test-secret-that-is-longer-than-thirty-two-characters";

describe("signed time-zone cookie", () => {
  beforeEach(() => {
    vi.stubEnv("TIME_ZONE_COOKIE_SECRET", secret);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips a valid supported time zone for its owner", async () => {
    const value = await createTimeZoneCookieValue(
      "user-123",
      "America/New_York",
      1_000,
    );

    await expect(
      readTimeZoneCookieValue(value ?? undefined, "user-123", 2_000),
    ).resolves.toBe("America/New_York");
  });

  it("rejects tampering, expiry, and an account switch", async () => {
    const value = await createTimeZoneCookieValue(
      "user-123",
      "America/Chicago",
      1_000,
    );

    expect(value).not.toBeNull();
    await expect(
      readTimeZoneCookieValue(`${value}x`, "user-123", 2_000),
    ).resolves.toBeNull();
    await expect(
      readTimeZoneCookieValue(value ?? undefined, "user-456", 2_000),
    ).resolves.toBeNull();
    await expect(
      readTimeZoneCookieValue(value ?? undefined, "user-123", 2_700_000_000),
    ).resolves.toBeNull();
  });

  it("fails closed when the server secret is unavailable", async () => {
    vi.stubEnv("TIME_ZONE_COOKIE_SECRET", "short");

    await expect(
      createTimeZoneCookieValue("user-123", "UTC"),
    ).resolves.toBeNull();
    await expect(
      readTimeZoneCookieValue("payload.signature", "user-123"),
    ).resolves.toBeNull();
  });
});
