import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { WeeklyViewModel } from "@/lib/week";

import { WeekView } from "./week-view";

const week: WeeklyViewModel = {
  currentLocalDate: "2026-08-12",
  endDate: "2026-08-16",
  localDates: [
    "2026-08-10",
    "2026-08-11",
    "2026-08-12",
    "2026-08-13",
    "2026-08-14",
    "2026-08-15",
    "2026-08-16",
  ],
  rows: [
    {
      cells: [
        { completionId: "done-1", localDate: "2026-08-10", state: "completed" },
        { completionId: null, localDate: "2026-08-11", state: "incomplete" },
        { completionId: null, localDate: "2026-08-12", state: "incomplete" },
        { completionId: null, localDate: "2026-08-13", state: "incomplete" },
        { completionId: null, localDate: "2026-08-14", state: "not-scheduled" },
        { completionId: null, localDate: "2026-08-15", state: "not-scheduled" },
        { completionId: null, localDate: "2026-08-16", state: "not-scheduled" },
      ],
      color: "fern",
      displayOrder: 0,
      icon: "🚶",
      id: "habit-a",
      name: "Morning walk",
    },
  ],
  startDate: "2026-08-10",
  status: "ready",
  timeZone: "America/New_York",
  weekStartsOn: 1,
};

describe("Week view", () => {
  it("renders a semantic seven-day grid with emoji-only visual identity", () => {
    render(<WeekView week={week} />);

    const table = screen.getByRole("table", {
      name: "Habit completion status for Aug 10–Aug 16",
    });
    expect(within(table).getAllByRole("columnheader")).toHaveLength(8);
    expect(
      within(table).getByRole("rowheader", { name: /Morning walk/ }),
    ).toBeVisible();
    expect(within(table).getByText("🚶")).toBeVisible();
    expect(within(table).getByText("Morning walk").className).toContain(
      "srOnly",
    );
    expect(
      screen.getByRole("region", { name: "Scrollable weekly habit grid" }),
    ).toHaveAttribute("tabindex", "0");
  });

  it("exposes completed, incomplete, today, future, and unscheduled labels", () => {
    render(<WeekView week={week} />);

    expect(
      screen.getByText(/Morning walk, Monday, August 10, 2026, completed/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Morning walk, Wednesday, August 12, 2026, today, incomplete/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Morning walk, Thursday, August 13, 2026, future, incomplete/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Morning walk, Friday, August 14, 2026, future, not scheduled/,
      ),
    ).toBeInTheDocument();
  });

  it("renders an encouraging empty week", () => {
    render(<WeekView week={{ ...week, rows: [], status: "empty" }} />);

    expect(
      screen.getByRole("heading", {
        name: "No habits are scheduled this week.",
      }),
    ).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
