import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

// Exercise the production shell CSS without requiring a real user's session.
async function mountShell(page: Page, contentHeight: number) {
  const tokens = await readFile("src/app/tokens.css", "utf8");
  const globals = await readFile("src/app/globals.css", "utf8");
  await page.setContent(`
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>${tokens}${globals.replaceAll(/^@import .*;$/gm, "")}</style>
    <div class="app-shell">
      <header class="mobile-header">Habit Ledger</header>
      <aside class="app-navigation-frame">
        <nav aria-label="Primary navigation"><ul class="primary-nav-list">
          ${["Today", "Week", "Stats", "Setup"].map((label) => `<li><a class="primary-nav-link" href="#">${label}</a></li>`).join("")}
        </ul></nav>
      </aside>
      <main class="app-main"><div style="height:${contentHeight}px">Habits</div><button>Last habit</button></main>
    </div>
  `);
}

async function expectBottomNavigation(page: Page) {
  await expect(async () => {
    const bar = await page.locator(".app-navigation-frame").boundingBox();
    expect(bar).not.toBeNull();
    expect(
      Math.abs(bar!.y + bar!.height - page.viewportSize()!.height),
    ).toBeLessThan(2);
    expect(bar!.x).toBe(0);
    expect(bar!.width).toBe(page.viewportSize()!.width);
  }).toPass();
}

test("navigation follows the viewport through iPad split-view resizing and scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 1024 });
  await mountShell(page, 2400);

  for (const viewport of [
    { width: 640, height: 1024 },
    { width: 390, height: 844 },
    { width: 640, height: 760 },
    { width: 640, height: 1100 },
  ]) {
    await page.setViewportSize(viewport);
    for (const scrollY of [0, 600, 1600]) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      await expectBottomNavigation(page);
    }
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expectBottomNavigation(page);
  const lastHabit = await page
    .getByRole("button", { name: "Last habit" })
    .boundingBox();
  const bar = await page.locator(".app-navigation-frame").boundingBox();
  expect(lastHabit!.y + lastHabit!.height).toBeLessThanOrEqual(bar!.y);

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(async () => {
    const sidebar = await page.locator(".app-navigation-frame").boundingBox();
    expect(sidebar!.y).toBe(0);
    expect(sidebar!.height).toBe(768);
    expect(sidebar!.width).toBeLessThan(400);
  }).toPass();
});

test("short mobile pages keep navigation at the bottom without extra scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 1024 });
  await mountShell(page, 100);
  await expectBottomNavigation(page);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(
    1024,
  );
});
