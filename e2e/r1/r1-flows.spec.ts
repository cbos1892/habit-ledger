import { expect, test, type Page } from "@playwright/test";
import axe from "axe-core";

async function expectNoAxeViolations(page: Page) {
  await page.addScriptTag({ content: axe.source });

  const violations = await page.evaluate(async () => {
    const axeRunner = (
      window as unknown as {
        axe: {
          run: (
            context: Document,
            options: { rules: Record<string, { enabled: boolean }> },
          ) => Promise<{ violations: Array<{ id: string }> }>;
        };
      }
    ).axe;
    const results = await axeRunner.run(document, {
      rules: {
        // The authenticated fixture can use user-selected colors; component
        // tests cover structure while browser review covers rendered contrast.
        "color-contrast": { enabled: false },
      },
    });

    return results.violations.map(({ id }) => id);
  });

  expect(violations).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
}

test.describe("Today check-in", () => {
  test("persists keyboard completion and undo across refresh", async ({
    page,
  }) => {
    await page.goto("/today", { waitUntil: "domcontentloaded" });

    const habit = page.locator("main button[aria-pressed]").first();
    await expect(habit).toBeVisible();
    const originalPressed = await habit.getAttribute("aria-pressed");
    const originalProgress = Number(
      await page
        .getByRole("progressbar", { name: "Habits completed today" })
        .getAttribute("aria-valuenow"),
    );

    await habit.focus();
    await page.keyboard.press("Space");
    await expect(habit).toHaveAttribute(
      "aria-pressed",
      originalPressed === "true" ? "false" : "true",
    );
    await expect(
      page.getByRole("progressbar", { name: "Habits completed today" }),
    ).toHaveAttribute(
      "aria-valuenow",
      String(originalProgress + (originalPressed === "true" ? -1 : 1)),
    );

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(habit).toHaveAttribute(
      "aria-pressed",
      originalPressed === "true" ? "false" : "true",
    );

    await habit.focus();
    await page.keyboard.press("Space");
    await expect(habit).toHaveAttribute("aria-pressed", originalPressed!);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(habit).toHaveAttribute("aria-pressed", originalPressed!);
  });

  test("restores optimistic state after a failed write", async ({ page }) => {
    await page.goto("/today", { waitUntil: "domcontentloaded" });

    const habit = page.locator("main button[aria-pressed]").first();
    await expect(habit).toBeVisible();
    const originalPressed = await habit.getAttribute("aria-pressed");

    await page.route(
      "**/today",
      async (route) => {
        if (route.request().method() === "POST") {
          await route.abort("failed");
        } else {
          await route.continue();
        }
      },
      { times: 1 },
    );

    await habit.focus();
    await page.keyboard.press("Space");

    await expect(page.getByRole("alert")).toContainText(
      "previous check-in is restored",
    );
    await expect(habit).toHaveAttribute("aria-pressed", originalPressed!);
  });

  test("has an understandable accessible structure", async ({ page }) => {
    await page.goto("/today", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("progressbar", { name: "Habits completed today" }),
    ).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

test.describe("R1 narrow-screen flows", () => {
  test.use({ viewport: { width: 320, height: 740 } });

  test("Today and Setup stay within the phone viewport", async ({ page }) => {
    for (const route of ["/today", "/setup", "/setup/habits/new"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expectNoHorizontalOverflow(page);
    }
  });

  test("the habit schedule can be edited and validated by keyboard", async ({
    page,
  }) => {
    await page.goto("/setup/habits/new", {
      waitUntil: "domcontentloaded",
    });

    const everyDay = page.getByLabel("Every day");
    await everyDay.focus();
    await page.keyboard.press("Space");
    await expect(everyDay).not.toBeChecked();
    await expect(page.getByLabel("Monday")).not.toBeChecked();

    const monday = page.getByLabel("Monday");
    await monday.focus();
    await page.keyboard.press("Space");
    await expect(monday).toBeChecked();

    await page.keyboard.press("Space");
    await expect(monday).not.toBeChecked();
    await page.getByRole("button", { name: "Create habit" }).click();

    await expect(page.getByRole("alert")).toContainText("Habit not saved");
    await expect(page.getByText("Choose at least one day")).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
