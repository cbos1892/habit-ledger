import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { HabitCompletionStatistic } from "../../../lib/stats";
import { HabitInsights } from "./habit-insights";

function habit(
  id: string,
  overrides: Partial<HabitCompletionStatistic> = {},
): HabitCompletionStatistic {
  return {
    color: "fern",
    completedCount: 3,
    displayOrder: 0,
    hasPositiveContinuity: false,
    icon: "🌱",
    id,
    name: id,
    opportunityCount: 5,
    percentage: 60,
    ...overrides,
  };
}

function renderedIds(testId: string) {
  return within(screen.getByTestId(testId))
    .getAllByRole("listitem")
    .map((item) => item.getAttribute("data-habit-id"));
}

describe("HabitInsights", () => {
  it("ranks strongest habits by unrounded rate before opportunity count", () => {
    render(
      <HabitInsights
        habits={[
          habit("larger-rounded-tie", {
            completedCount: 59,
            opportunityCount: 99,
            percentage: 60,
          }),
          habit("higher-raw-rate", {
            completedCount: 3,
            displayOrder: 2,
            opportunityCount: 5,
            percentage: 60,
          }),
          habit("steady", {
            completedCount: 4,
            opportunityCount: 8,
            percentage: 50,
          }),
          habit("space", {
            completedCount: 1,
            opportunityCount: 6,
            percentage: 17,
          }),
        ]}
      />,
    );

    expect(renderedIds("strongest-habits")).toEqual([
      "higher-raw-rate",
      "larger-rounded-tie",
    ]);
    expect(
      within(screen.getByTestId("strongest-habits")).getAllByText("60%"),
    ).toHaveLength(2);
    expect(screen.getByText("3 of 5 scheduled opportunities")).toBeVisible();
  });

  it("uses opportunity count, saved order, and id to make exact ties stable without splitting a tied rate", () => {
    render(
      <HabitInsights
        habits={[
          habit("z-id", {
            completedCount: 4,
            displayOrder: 4,
            opportunityCount: 8,
            percentage: 50,
          }),
          habit("a-id", {
            completedCount: 2,
            displayOrder: 4,
            opportunityCount: 4,
            percentage: 50,
          }),
          habit("b-id", {
            completedCount: 2,
            displayOrder: 4,
            opportunityCount: 4,
            percentage: 50,
          }),
          habit("saved-later", {
            completedCount: 2,
            displayOrder: 9,
            opportunityCount: 4,
            percentage: 50,
          }),
          habit("gentle", {
            completedCount: 1,
            displayOrder: 0,
            opportunityCount: 5,
            percentage: 20,
          }),
        ]}
      />,
    );

    expect(renderedIds("strongest-habits")).toEqual([
      "z-id",
      "a-id",
      "b-id",
      "saved-later",
    ]);
    expect(renderedIds("support-habits")).toEqual(["gentle"]);
  });

  it("excludes zero-opportunity habits and collapses to one section for sparse data", () => {
    const { rerender } = render(
      <HabitInsights
        habits={[
          habit("not-started", {
            completedCount: 0,
            hasPositiveContinuity: true,
            opportunityCount: 0,
            percentage: null,
          }),
        ]}
      />,
    );

    expect(screen.queryByTestId("habit-insights")).not.toBeInTheDocument();

    rerender(
      <HabitInsights
        habits={[
          habit("not-started", {
            completedCount: 0,
            opportunityCount: 0,
            percentage: null,
          }),
          habit("new-habit", {
            completedCount: 1,
            name: "New habit",
            opportunityCount: 1,
            percentage: 100,
          }),
        ]}
      />,
    );

    expect(renderedIds("strongest-habits")).toEqual(["new-habit"]);
    expect(screen.queryByTestId("support-habits")).not.toBeInTheDocument();
    expect(screen.queryByText("not-started")).not.toBeInTheDocument();
  });

  it("shows continuity only for a verified perfect habit in the strongest group", () => {
    render(
      <HabitInsights
        habits={[
          habit("perfect", {
            completedCount: 7,
            hasPositiveContinuity: true,
            opportunityCount: 7,
            percentage: 100,
          }),
          habit("unverified", {
            completedCount: 3,
            hasPositiveContinuity: true,
            opportunityCount: 4,
            percentage: 75,
          }),
          habit("support", {
            completedCount: 0,
            hasPositiveContinuity: true,
            opportunityCount: 6,
            percentage: 0,
          }),
        ]}
      />,
    );

    expect(screen.getAllByText("Two weeks strong")).toHaveLength(1);
    expect(
      within(
        screen.getByTestId("strongest-habits").children[0] as HTMLElement,
      ).getByText("Two weeks strong"),
    ).toBeVisible();
    expect(
      within(screen.getByTestId("support-habits")).queryByText(
        "Two weeks strong",
      ),
    ).not.toBeInTheDocument();
  });

  it("uses gentle support language and never exposes negative streak mechanics", () => {
    render(
      <HabitInsights
        habits={[
          habit("finding-rhythm", {
            completedCount: 6,
            name: "Finding a rhythm",
            opportunityCount: 7,
            percentage: 86,
          }),
          habit("small-start", {
            completedCount: 1,
            name: "A small start",
            opportunityCount: 7,
            percentage: 14,
          }),
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "A gentle place to focus" }),
    ).toBeVisible();
    expect(screen.getByText("1 of 7 scheduled opportunities")).toBeVisible();
    expect(
      screen.queryByText(/fail|missed|broken|reset|longest|streak/i),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("🌱")[0]).toHaveAttribute("aria-hidden", "true");
  });
});
