import { render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

import type { WeeklyCompletionPoint } from "../../../lib/stats";
import { TrendChart } from "./trend-chart";

function week(
  index: number,
  overrides: Partial<WeeklyCompletionPoint> = {},
): WeeklyCompletionPoint {
  const startDate = new Date(Date.UTC(2026, 6, 6 + index * 7));
  const endDate = new Date(Date.UTC(2026, 6, 12 + index * 7));

  return {
    completedCount: 3,
    endDate: endDate.toISOString().slice(0, 10),
    isCurrentWeek: false,
    isPartial: false,
    opportunityCount: 4,
    percentage: 75,
    startDate: startDate.toISOString().slice(0, 10),
    ...overrides,
  };
}

function eightWeeks(): readonly WeeklyCompletionPoint[] {
  return [
    week(0),
    week(1, { completedCount: 4, percentage: 100 }),
    week(2, { completedCount: 2, percentage: 50 }),
    week(3, { completedCount: 1, percentage: 25 }),
    week(4, {
      endDate: "2026-08-09",
      startDate: "2026-08-03",
    }),
    week(5, {
      completedCount: 0,
      endDate: "2026-08-16",
      opportunityCount: 0,
      percentage: null,
      startDate: "2026-08-10",
    }),
    week(6, {
      completedCount: 0,
      endDate: "2026-08-23",
      percentage: 0,
      startDate: "2026-08-17",
    }),
    week(7, {
      completedCount: 2,
      endDate: "2026-08-30",
      isCurrentWeek: true,
      isPartial: true,
      opportunityCount: 3,
      percentage: 67,
      startDate: "2026-08-24",
    }),
  ];
}

describe("TrendChart", () => {
  it("renders exactly eight whole-percentage values in a responsive structure", () => {
    const { container } = render(<TrendChart weekly={eightWeeks()} />);
    const chart = screen.getByRole("list", {
      name: "Weekly completion percentages",
    });

    expect(within(chart).getAllByRole("listitem")).toHaveLength(8);
    expect(chart).toHaveAttribute(
      "data-responsive-structure",
      "eight-equal-columns",
    );
    expect(within(chart).getByText("100%")).toBeInTheDocument();
    expect(within(chart).getByText("0%")).toBeInTheDocument();
    expect(
      container.querySelector('[data-trend-chart="eight-week"]'),
    ).toBeInTheDocument();
  });

  it("distinguishes the current partial week in visible and accessible copy", () => {
    render(<TrendChart weekly={eightWeeks()} />);

    expect(
      screen.getByText("current, partial week", { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", {
        name: /August 24, 2026 through August 30, 2026: 67 percent.*Current week, still in progress\./,
      }),
    ).toHaveAttribute("data-partial", "true");
    expect(
      screen.getByRole("cell", { name: "In progress" }),
    ).toBeInTheDocument();
  });

  it("presents a no-opportunity week as unavailable rather than zero percent", () => {
    render(<TrendChart weekly={eightWeeks()} />);

    const unavailableWeek = screen.getByRole("listitem", {
      name: /August 10, 2026 through August 16, 2026: unavailable because there were no scheduled opportunities\./,
    });

    expect(unavailableWeek).toHaveAttribute("data-state", "unavailable");
    expect(within(unavailableWeek).queryByText("0%")).not.toBeInTheDocument();
    expect(screen.getAllByRole("cell", { name: "Unavailable" })).toHaveLength(
      2,
    );
  });

  it("provides an accessible name and a complete tabular equivalent", async () => {
    const { container } = render(<TrendChart weekly={eightWeeks()} />);

    expect(
      screen.getByRole("region", { name: "Completion trend" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", {
        name: "Text equivalent of the eight-week completion trend",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", {
        name: "Scrollable weekly values table",
      }),
    ).toHaveAttribute("tabindex", "0");
    expect(screen.getAllByRole("row")).toHaveLength(9);
    expect(
      screen.getByRole("listitem", {
        name: /July 6, 2026 through July 12, 2026: 75 percent, 3 of 4 scheduled opportunities completed\./,
      }),
    ).toBeInTheDocument();

    const results = await axe.run(container, {
      rules: {
        // JSDOM does not calculate the rendered colors needed by this rule.
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations.map(({ id }) => id)).toEqual([]);
  });

  it("rejects a series that is not exactly eight user-aligned weeks", () => {
    expect(() =>
      render(<TrendChart weekly={eightWeeks().slice(0, 7)} />),
    ).toThrow(/requires exactly 8 weekly points; received 7/);
  });
});
