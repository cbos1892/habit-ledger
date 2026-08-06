import { describe, expect, it } from "vitest";

import { getRequestOrigin, getSafeAuthRedirect } from "./redirects";

describe("getSafeAuthRedirect", () => {
  it("allows only known application destinations", () => {
    expect(getSafeAuthRedirect("/week?focus=2026-08-06")).toBe(
      "/week?focus=2026-08-06",
    );
    expect(getSafeAuthRedirect("/admin")).toBe("/today");
    expect(getSafeAuthRedirect("https://example.com/today")).toBe("/today");
    expect(getSafeAuthRedirect("//example.com/today")).toBe("/today");
  });

  it("uses today when no destination is supplied", () => {
    expect(getSafeAuthRedirect(null)).toBe("/today");
  });
});

describe("getRequestOrigin", () => {
  it("prefers a valid request origin", () => {
    expect(
      getRequestOrigin(
        new Headers({ host: "ignored.test", origin: "https://app.test" }),
      ),
    ).toBe("https://app.test");
  });

  it("derives local origins with http", () => {
    expect(getRequestOrigin(new Headers({ host: "localhost:3000" }))).toBe(
      "http://localhost:3000",
    );
  });

  it("rejects malformed forwarded hosts", () => {
    expect(() =>
      getRequestOrigin(new Headers({ "x-forwarded-host": "user@evil.test" })),
    ).toThrow("safe application origin");
  });
});
