import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WeeklyViewModel } from "@/lib/week";

import { setHabitCompletion } from "./completion-actions";
import { WeekView } from "./week-view";

vi.mock("./completion-actions", () => ({
  setHabitCompletion: vi.fn(),
}));

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
  beforeEach(() => {
    vi.mocked(setHabitCompletion).mockReset();
  });

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

  it("links to adjacent local weeks and prevents future-week navigation", () => {
    render(<WeekView week={week} />);

    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/week?week=2026-08-03",
    );
    expect(screen.getByRole("link", { name: "This week" })).toHaveAttribute(
      "href",
      "/week",
    );
    expect(screen.getByText("Next", { exact: false })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("allows a historical week to move forward by one calendar week", () => {
    render(
      <WeekView
        week={{
          ...week,
          endDate: "2026-08-09",
          localDates: [
            "2026-08-03",
            "2026-08-04",
            "2026-08-05",
            "2026-08-06",
            "2026-08-07",
            "2026-08-08",
            "2026-08-09",
          ],
          rows: [],
          startDate: "2026-08-03",
          status: "empty",
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/week?week=2026-08-10",
    );
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

  it("optimistically edits an eligible cell and updates row progress", async () => {
    let resolveMutation:
      | ((value: Awaited<ReturnType<typeof setHabitCompletion>>) => void)
      | undefined;
    vi.mocked(setHabitCompletion).mockReturnValue(
      new Promise((resolve) => {
        resolveMutation = resolve;
      }),
    );
    render(<WeekView week={week} />);

    const cell = screen.getByRole("button", {
      name: /Morning walk, Wednesday, August 12, 2026, today, incomplete/,
    });
    fireEvent.click(cell);

    expect(
      screen.getByRole("button", {
        name: /Morning walk, Wednesday, August 12, 2026, today, completed/,
      }),
    ).toBeDisabled();
    const progress = screen.getByRole("progressbar", {
      name: "Morning walk weekly progress",
    });
    expect(progress).toHaveAttribute("aria-valuenow", "2");
    expect(progress).toHaveAttribute(
      "aria-valuetext",
      "2 of 4 scheduled days complete",
    );
    expect(progress).toHaveTextContent("");
    expect(screen.queryByText(/weekly progress/i)).not.toBeInTheDocument();
    expect(setHabitCompletion).toHaveBeenCalledWith(
      "habit-a",
      true,
      "2026-08-12",
    );

    await act(async () => {
      resolveMutation?.({
        status: "success",
        habitId: "habit-a",
        completed: true,
        completionId: "done-2",
        localDate: "2026-08-12",
      });
    });
  });

  it("does not make future or unscheduled cells interactive", () => {
    render(<WeekView week={week} />);

    expect(
      screen.queryByRole("button", {
        name: /Thursday, August 13, 2026, future/,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /Friday, August 14, 2026, future, not scheduled/,
      }),
    ).not.toBeInTheDocument();
  });

  it("restores the cell and row progress after a failed write", async () => {
    vi.mocked(setHabitCompletion).mockResolvedValue({
      status: "error",
      message:
        "We couldn't update this habit. Your previous check-in is restored.",
    });
    render(<WeekView week={week} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Tuesday, August 11, 2026, incomplete/,
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "previous check-in is restored",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: /Tuesday, August 11, 2026, incomplete/,
        }),
      ).toHaveAttribute("aria-pressed", "false"),
    );
    expect(
      screen.getByRole("progressbar", { name: "Morning walk weekly progress" }),
    ).toHaveAttribute("aria-valuetext", "1 of 4 scheduled days complete");
  });

  it("marks completed rows and perfect scheduled days without replaying a celebration", () => {
    const completedWeek: WeeklyViewModel = {
      ...week,
      currentLocalDate: "2026-08-16",
      rows: [
        {
          ...week.rows[0],
          cells: week.localDates.map((localDate, index) => ({
            completionId: index === 0 ? "done-1" : null,
            localDate,
            state: index === 0 ? "completed" : "not-scheduled",
          })),
        },
      ],
    };

    render(<WeekView week={completedWeek} />);

    expect(screen.getByRole("row", { name: /Morning walk/ })).toHaveAttribute(
      "data-complete",
      "true",
    );
    expect(screen.getByRole("row", { name: /Morning walk/ })).toHaveAttribute(
      "data-color",
      "fern",
    );
    expect(
      screen.getByRole("columnheader", {
        name: /Monday, August 10, 2026.*Perfect scheduled day/,
      }),
    ).toHaveAttribute("data-perfect", "true");
    expect(
      screen.getByRole("progressbar", { name: "Morning walk weekly progress" }),
    ).toHaveAttribute("aria-valuenow", "1");
    expect(screen.queryByText(/week is complete/)).not.toBeInTheDocument();
  });

  it("celebrates only when an edit newly completes a row and scheduled day", async () => {
    vi.mocked(setHabitCompletion).mockResolvedValue({
      status: "success",
      habitId: "habit-a",
      completed: true,
      completionId: "done-2",
      localDate: "2026-08-11",
    });
    const milestoneWeek: WeeklyViewModel = {
      ...week,
      currentLocalDate: "2026-08-16",
      rows: [
        {
          ...week.rows[0],
          cells: week.localDates.map((localDate, index) => ({
            completionId: index === 0 ? "done-1" : null,
            localDate,
            state:
              index === 0
                ? "completed"
                : index === 1
                  ? "incomplete"
                  : "not-scheduled",
          })),
        },
      ],
    };

    render(<WeekView week={milestoneWeek} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: /Morning walk, Tuesday, August 11, 2026, incomplete/,
      }),
    );

    expect(screen.getByRole("row", { name: /Morning walk/ })).toHaveAttribute(
      "data-celebrating",
      "true",
    );
    expect(
      screen.getByRole("columnheader", {
        name: /Tuesday, August 11, 2026.*Perfect scheduled day/,
      }),
    ).toHaveAttribute("data-celebrating", "true");
    expect(
      screen.getByText(
        "Morning walk’s week is complete. Tue is a perfect scheduled day.",
      ),
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(setHabitCompletion).toHaveBeenCalledWith(
        "habit-a",
        true,
        "2026-08-11",
      ),
    );
  });
});
