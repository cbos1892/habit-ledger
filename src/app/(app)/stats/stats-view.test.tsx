import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { StatisticsViewModel } from "../../../lib/stats";
import StatsError from "./error";
import StatsLoading from "./loading";
import { StatsView } from "./stats-view";

function statistics(
  overrides: Partial<StatisticsViewModel> = {},
): StatisticsViewModel {
  return {
    currentLocalDate: "2026-08-10",
    habits: [],
    overall: {
      completedCount: 21,
      endDate: "2026-08-10",
      opportunityCount: 21,
      percentage: 100,
      startDate: "2026-07-28",
    },
    status: "ready",
    timeZone: "UTC",
    weekStartsOn: 1,
    weekly: [],
    ...overrides,
  };
}

describe("Stats view", () => {
  it("presents a large whole-number rate separately from its muted symbol with a complete text equivalent", () => {
    render(<StatsView statistics={statistics()} />);

    expect(
      screen.getByRole("heading", { name: "Overall completion" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("stats-percentage")).toHaveTextContent("100");
    expect(screen.getByText("%")).toHaveAttribute("class");
    expect(
      screen.getByText(
        /21 of 21 scheduled habit opportunities completed from July 28, 2026 through August 10, 2026: 100 percent\./,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Jul 28 – Aug 10, 2026")).toBeInTheDocument();
  });

  it("renders distinct no-habit and no-opportunity states without a zero percent", () => {
    const { rerender } = render(
      <StatsView
        statistics={statistics({
          overall: {
            completedCount: 0,
            endDate: "2026-08-10",
            opportunityCount: 0,
            percentage: null,
            startDate: "2026-07-28",
          },
          status: "no-habits",
        })}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Your progress story starts with a habit.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create a habit" }),
    ).toHaveAttribute("href", "/setup");
    expect(screen.queryByText("0%")).not.toBeInTheDocument();

    rerender(
      <StatsView
        statistics={statistics({
          habits: [
            {
              color: "fern",
              completedCount: 0,
              displayOrder: 10,
              hasPositiveContinuity: false,
              icon: "🌱",
              id: "future-habit",
              name: "Future habit",
              opportunityCount: 0,
              percentage: null,
            },
          ],
          overall: {
            completedCount: 0,
            endDate: "2026-08-10",
            opportunityCount: 0,
            percentage: null,
            startDate: "2026-07-28",
          },
          status: "no-opportunities",
        })}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "No scheduled opportunities yet." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Review your schedule" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("stats-percentage")).not.toBeInTheDocument();
  });

  it("keeps trend and insight extension slots in a deterministic order", () => {
    const { container } = render(
      <StatsView
        statistics={statistics()}
        trendSection={<section>Weekly trend</section>}
        insightsSection={<section>Habit insights</section>}
      />,
    );
    const extensions = container.querySelector("[data-stats-sections]");

    expect(extensions).not.toBeNull();
    expect(
      within(extensions as HTMLElement).getByText("Weekly trend"),
    ).toBeInTheDocument();
    expect(
      within(extensions as HTMLElement).getByText("Habit insights"),
    ).toBeInTheDocument();
    expect(
      Array.from(extensions?.children ?? []).map((element) =>
        element.getAttribute("data-stats-section"),
      ),
    ).toEqual(["trend", "insights"]);
  });
});

describe("Stats route states", () => {
  it("reserves the summary and downstream section structure while loading", () => {
    const { container } = render(<StatsLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Gathering your progress…",
    );
    expect(
      container.querySelector('[data-stats-state="loading"]'),
    ).toHaveAttribute("aria-busy", "true");
    expect(
      container.querySelectorAll('[aria-hidden="true"] > span'),
    ).not.toHaveLength(0);
  });

  it("offers a recoverable route error", () => {
    const retry = vi.fn();
    render(<StatsError error={new Error("offline")} retry={retry} />);

    expect(
      screen.getByRole("heading", { name: "Your stats could not be loaded." }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
