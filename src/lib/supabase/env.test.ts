import { describe, expect, it } from "vitest";

import { parseSupabasePublicEnv } from "./env";

describe("parseSupabasePublicEnv", () => {
  it("returns normalized, immutable public configuration", () => {
    const env = parseSupabasePublicEnv({
      url: " https://example.supabase.co ",
      publishableKey: " sb_publishable_example ",
    });

    expect(env).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_example",
    });
    expect(Object.isFrozen(env)).toBe(true);
  });

  it.each([
    ["NEXT_PUBLIC_SUPABASE_URL", { publishableKey: "public-key" }],
    [
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      { url: "https://example.supabase.co" },
    ],
  ])("identifies a missing %s value", (variableName, input) => {
    expect(() => parseSupabasePublicEnv(input)).toThrow(variableName);
  });

  it("rejects an invalid project URL", () => {
    expect(() =>
      parseSupabasePublicEnv({
        url: "not-a-url",
        publishableKey: "sb_publishable_example",
      }),
    ).toThrow("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP or HTTPS URL");
  });

  it("rejects a secret key in public configuration", () => {
    expect(() =>
      parseSupabasePublicEnv({
        url: "https://example.supabase.co",
        publishableKey: "sb_secret_example",
      }),
    ).toThrow("cannot contain a Supabase secret key");
  });
});
