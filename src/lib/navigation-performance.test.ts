import { describe, expect, it } from "vitest";

import {
  percentile,
  summarizeSamples,
  type NavigationSample,
} from "../../e2e/navigation-performance/report";

const sample = (run: "cold" | "warm", content: number): NavigationSample => ({
  run,
  iteration: 1,
  from: "/today",
  to: "/week",
  clickToFeedbackMs: content / 2,
  clickToContentMs: content,
  requests: 2,
  serverRequests: 1,
  supabaseRequests: 1,
  longTaskCount: 0,
  longTaskDurationMs: 0,
  cls: 0,
  lcpMs: 100,
  maxInteractionMs: 8,
});

describe("navigation performance reporting", () => {
  it("uses the nearest-rank percentile for repeatable baselines", () => {
    expect(percentile([40, 10, 30, 20], 0.5)).toBe(20);
    expect(percentile([40, 10, 30, 20], 0.75)).toBe(30);
  });

  it("keeps cold and warm results separate", () => {
    const summary = summarizeSamples([
      sample("cold", 400),
      sample("cold", 600),
      sample("warm", 100),
      sample("warm", 200),
    ]);

    expect(summary.cold.clickToContentMs).toEqual({ p50: 400, p75: 600 });
    expect(summary.warm.clickToContentMs).toEqual({ p50: 100, p75: 200 });
  });
});
