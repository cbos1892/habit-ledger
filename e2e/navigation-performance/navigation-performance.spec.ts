import { expect, test, type Page, type Request } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  renderMarkdownReport,
  summarizeSamples,
  type NavigationSample,
  type RunKind,
} from "./report";

const routes = [
  { href: "/week", label: "Week" },
  { href: "/stats", label: "Stats" },
  { href: "/setup", label: "Setup" },
  { href: "/today", label: "Today" },
] as const;

const sampleCount = Number.parseInt(process.env.NAV_PERF_SAMPLES ?? "5", 10);
const contentToleranceMs = Number.parseInt(
  process.env.NAV_PERF_MAX_P75_CONTENT_MS ?? "1500",
  10,
);
const enforceThresholds = process.env.NAV_PERF_ENFORCE_THRESHOLDS === "1";
const artifactDirectory = resolve("artifacts/navigation-performance");

type BrowserVitals = {
  cls: number;
  lcpMs: number | null;
  longTasks: { startTime: number; duration: number }[];
  interactions: { startTime: number; duration: number }[];
};

declare global {
  interface Window {
    __navigationVitals: BrowserVitals;
  }
}

function relevantRequest(request: Request) {
  return ["document", "fetch", "xhr"].includes(request.resourceType());
}

async function installPerformanceObservers(page: Page) {
  await page.addInitScript(() => {
    window.__navigationVitals = {
      cls: 0,
      lcpMs: null,
      longTasks: [],
      interactions: [],
    };

    const observe = (
      type: string,
      callback: (entry: PerformanceEntry) => void,
    ) => {
      try {
        new PerformanceObserver((list) =>
          list.getEntries().forEach(callback),
        ).observe({
          type,
          buffered: true,
        });
      } catch {
        // Some performance entry types are browser/version dependent.
      }
    };

    observe("layout-shift", (entry) => {
      const shift = entry as PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      };
      if (!shift.hadRecentInput) window.__navigationVitals.cls += shift.value;
    });
    observe("largest-contentful-paint", (entry) => {
      window.__navigationVitals.lcpMs = entry.startTime;
    });
    observe("longtask", (entry) => {
      window.__navigationVitals.longTasks.push({
        startTime: entry.startTime,
        duration: entry.duration,
      });
    });
    observe("event", (entry) => {
      if (entry.duration > 0) {
        window.__navigationVitals.interactions.push({
          startTime: entry.startTime,
          duration: entry.duration,
        });
      }
    });
  });
}

async function waitForClientNavigationReady(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(
    page.locator('nav[aria-label="Primary navigation"]'),
  ).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolveReady) => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolveReady()),
        );
      }),
  );
}

async function clickAndMeasure(page: Page, href: string, label: string) {
  return page.evaluate(
    ({ destination, destinationLabel }) =>
      new Promise<{
        startedAt: number;
        completedAt: number;
        clickToFeedbackMs: number;
        clickToContentMs: number;
      }>((resolveMeasurement, reject) => {
        const link = document.querySelector<HTMLAnchorElement>(
          `nav[aria-label="Primary navigation"] a[href="${destination}"]`,
        );
        const main = document.querySelector("#main-content");

        if (!link || !main) {
          reject(new Error(`Could not find navigation target ${destination}.`));
          return;
        }

        const startedAt = performance.now();
        const originalContent = main.textContent;
        let feedbackAt: number | null = null;
        const deadline = startedAt + 30_000;

        const check = () => {
          const now = performance.now();
          const active = link.getAttribute("aria-current") === "page";
          const contentChanged = main.textContent !== originalContent;
          const atDestination = window.location.pathname === destination;
          const headingMatches = [...main.querySelectorAll("h1")].some(
            (heading) => {
              const text = heading.textContent?.trim();
              return (
                text === destinationLabel ||
                (destination === "/setup" && text === "Welcome")
              );
            },
          );

          if (feedbackAt === null && (active || contentChanged))
            feedbackAt = now;

          if (atDestination && headingMatches) {
            resolveMeasurement({
              startedAt,
              completedAt: now,
              clickToFeedbackMs: (feedbackAt ?? now) - startedAt,
              clickToContentMs: now - startedAt,
            });
            return;
          }

          if (now >= deadline) {
            reject(
              new Error(`Navigation to ${destination} did not finish in 30s.`),
            );
            return;
          }

          requestAnimationFrame(check);
        };

        link.click();
        requestAnimationFrame(check);
      }),
    { destination: href, destinationLabel: label },
  );
}

async function measureRun(page: Page, run: RunKind) {
  const samples: NavigationSample[] = [];
  const requests: { url: string; resourceType: string; at: number }[] = [];
  const recordRequest = (request: Request) => {
    if (relevantRequest(request)) {
      requests.push({
        url: request.url(),
        resourceType: request.resourceType(),
        at: performance.now(),
      });
    }
  };

  page.on("request", recordRequest);

  for (let iteration = 1; iteration <= sampleCount; iteration += 1) {
    await page.goto("/today", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/today$/);
    await waitForClientNavigationReady(page);
    let from = "/today";

    for (const route of routes) {
      const requestStart = requests.length;
      const before = await page.evaluate(() => ({
        cls: window.__navigationVitals.cls,
        longTaskCount: window.__navigationVitals.longTasks.length,
        interactionCount: window.__navigationVitals.interactions.length,
      }));
      const timing = await clickAndMeasure(page, route.href, route.label);
      await page.waitForTimeout(100);
      const after = await page.evaluate(
        ({ startedAt, longTaskCount, interactionCount }) => {
          const longTasks =
            window.__navigationVitals.longTasks.slice(longTaskCount);
          const interactions = window.__navigationVitals.interactions
            .slice(interactionCount)
            .filter((entry) => entry.startTime >= startedAt);
          return {
            cls: window.__navigationVitals.cls,
            lcpMs: window.__navigationVitals.lcpMs,
            longTaskCount: longTasks.length,
            longTaskDurationMs: longTasks.reduce(
              (total, entry) => total + entry.duration,
              0,
            ),
            maxInteractionMs: Math.max(
              0,
              ...interactions.map((entry) => entry.duration),
            ),
          };
        },
        {
          startedAt: timing.startedAt,
          longTaskCount: before.longTaskCount,
          interactionCount: before.interactionCount,
        },
      );
      const navigationRequests = requests.slice(requestStart);

      samples.push({
        run,
        iteration,
        from,
        to: route.href,
        clickToFeedbackMs: timing.clickToFeedbackMs,
        clickToContentMs: timing.clickToContentMs,
        requests: navigationRequests.length,
        serverRequests: navigationRequests.filter(
          (request) =>
            new URL(request.url).origin === new URL(page.url()).origin,
        ).length,
        supabaseRequests: navigationRequests.filter((request) =>
          new URL(request.url).hostname.endsWith(".supabase.co"),
        ).length,
        longTaskCount: after.longTaskCount,
        longTaskDurationMs: after.longTaskDurationMs,
        cls: Math.max(0, after.cls - before.cls),
        lcpMs: after.lcpMs,
        maxInteractionMs: after.maxInteractionMs,
      });
      from = route.href;
    }
  }

  page.off("request", recordRequest);
  return samples;
}

test("records authenticated cold and warm navigation baselines", async ({
  browser,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "Cache control uses the Chromium CDP.");
  test.skip(
    !Number.isInteger(sampleCount) || sampleCount < 1,
    "NAV_PERF_SAMPLES must be a positive integer.",
  );

  const allSamples: NavigationSample[] = [];

  for (const run of ["cold", "warm"] as const) {
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      storageState: ".auth/navigation-performance.json",
    });
    const page = await context.newPage();
    await installPerformanceObservers(page);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", {
      cacheDisabled: run === "cold",
    });

    if (run === "warm") {
      await page.goto("/today", { waitUntil: "domcontentloaded" });
      await waitForClientNavigationReady(page);
      for (const route of routes)
        await clickAndMeasure(page, route.href, route.label);
    }

    allSamples.push(...(await measureRun(page, run)));
    await context.close();
  }

  const conditions = {
    target: new URL(testInfo.project.use.baseURL as string).origin,
    browser: `${browserName} ${testInfo.project.use.channel ?? "bundled"}`,
    samplesPerRoute: sampleCount,
    coldCacheDisabled: true,
    warmCachePrimed: true,
    contentP75AdvisoryMs: contentToleranceMs,
  };
  const summary = summarizeSamples(allSamples);
  await mkdir(artifactDirectory, { recursive: true });
  await Promise.all([
    writeFile(
      `${artifactDirectory}/baseline.json`,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          conditions,
          summary,
          samples: allSamples,
        },
        null,
        2,
      ),
    ),
    writeFile(
      `${artifactDirectory}/baseline.md`,
      renderMarkdownReport(allSamples, conditions),
    ),
  ]);

  const warmP75 = summary.warm.clickToContentMs.p75;
  const message = `Warm click-to-content p75 ${warmP75.toFixed(1)}ms (advisory limit ${contentToleranceMs}ms).`;
  testInfo.annotations.push({
    type: "navigation-performance",
    description: message,
  });

  if (enforceThresholds)
    expect(warmP75, message).toBeLessThanOrEqual(contentToleranceMs);
  else console.log(message);
});
