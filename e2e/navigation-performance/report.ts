export type RunKind = "cold" | "warm";

export type NavigationSample = {
  run: RunKind;
  iteration: number;
  from: string;
  to: string;
  clickToFeedbackMs: number;
  clickToContentMs: number;
  requests: number;
  serverRequests: number;
  supabaseRequests: number;
  longTaskCount: number;
  longTaskDurationMs: number;
  cls: number;
  lcpMs: number | null;
  maxInteractionMs: number;
};

export type MetricSummary = {
  p50: number;
  p75: number;
};

export function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil(percentileValue * sorted.length) - 1;
  return sorted[Math.max(0, index)]!;
}

function summarize(values: number[]): MetricSummary {
  return {
    p50: percentile(values, 0.5),
    p75: percentile(values, 0.75),
  };
}

export function summarizeSamples(samples: NavigationSample[]) {
  return Object.fromEntries(
    (["cold", "warm"] as const).map((run) => {
      const selected = samples.filter((sample) => sample.run === run);
      return [
        run,
        {
          sampleCount: selected.length,
          clickToFeedbackMs: summarize(
            selected.map((sample) => sample.clickToFeedbackMs),
          ),
          clickToContentMs: summarize(
            selected.map((sample) => sample.clickToContentMs),
          ),
          requests: summarize(selected.map((sample) => sample.requests)),
          serverRequests: summarize(
            selected.map((sample) => sample.serverRequests),
          ),
          supabaseRequests: summarize(
            selected.map((sample) => sample.supabaseRequests),
          ),
          longTaskDurationMs: summarize(
            selected.map((sample) => sample.longTaskDurationMs),
          ),
        },
      ];
    }),
  );
}

function formatMetric(metric: MetricSummary) {
  return `${metric.p50.toFixed(1)} / ${metric.p75.toFixed(1)}`;
}

export function renderMarkdownReport(
  samples: NavigationSample[],
  conditions: Record<string, string | number | boolean>,
) {
  const summary = summarizeSamples(samples);
  const rows = (["cold", "warm"] as const).map((run) => {
    const result = summary[run];
    return `| ${run} | ${result.sampleCount} | ${formatMetric(result.clickToFeedbackMs)} | ${formatMetric(result.clickToContentMs)} | ${formatMetric(result.requests)} | ${formatMetric(result.serverRequests)} | ${formatMetric(result.supabaseRequests)} | ${formatMetric(result.longTaskDurationMs)} |`;
  });

  return `# Authenticated navigation baseline

Generated: ${new Date().toISOString()}

## Conditions

${Object.entries(conditions)
  .map(([key, value]) => `- **${key}:** ${value}`)
  .join("\n")}

## Summary

Values are p50 / p75. Durations are milliseconds.

| Run | Samples | Click → feedback | Click → content | Requests | Server requests | Supabase requests | Long-task duration |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${rows.join("\n")}

## Per-navigation samples

| Run | Iteration | Route | Feedback (ms) | Content (ms) | Requests | Server | Supabase | Long tasks | CLS | LCP (ms) | Max interaction (ms) |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${samples
  .map(
    (sample) =>
      `| ${sample.run} | ${sample.iteration} | ${sample.from} → ${sample.to} | ${sample.clickToFeedbackMs.toFixed(1)} | ${sample.clickToContentMs.toFixed(1)} | ${sample.requests} | ${sample.serverRequests} | ${sample.supabaseRequests} | ${sample.longTaskCount} / ${sample.longTaskDurationMs.toFixed(1)} ms | ${sample.cls.toFixed(4)} | ${sample.lcpMs?.toFixed(1) ?? "n/a"} | ${sample.maxInteractionMs.toFixed(1)} |`,
  )
  .join("\n")}
`;
}
