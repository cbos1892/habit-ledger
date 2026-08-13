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
    expect(
      screen.getByLabelText("2 of 4 scheduled days complete"),
    ).toHaveTextContent("2/4");
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
      screen.getByLabelText("1 of 4 scheduled days complete"),
    ).toHaveTextContent("1/4");
  });
});
