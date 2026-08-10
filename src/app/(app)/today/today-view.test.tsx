import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TodayError from "./error";
import TodayLoading from "./loading";
import { TodayView } from "./today-view";

describe("Today view", () => {
  it("renders habit identity, completion state, and progress from one view model", () => {
    render(
      <TodayView
        today={{
          completedCount: 1,
          habits: [
            {
              id: "a",
              name: "Morning walk",
              icon: "🚶",
              color: "fern",
              completed: true,
              completionId: "c1",
              displayOrder: 0,
            },
            {
              id: "b",
              name: "Read",
              icon: "📚",
              color: "plum",
              completed: false,
              completionId: null,
              displayOrder: 1,
            },
          ],
          localDate: "2026-08-10",
          status: "ready",
          timeZone: "America/New_York",
          totalCount: 2,
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByText("Monday, August 10, 2026")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuemax",
      "2",
    );
    expect(
      screen.getByRole("button", { name: "Morning walk, complete" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Read, not complete" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("renders an encouraging empty state without a zero-value progress card", () => {
    render(
      <TodayView
        today={{
          completedCount: 0,
          habits: [],
          localDate: "2026-08-10",
          status: "empty",
          timeZone: "UTC",
          totalCount: 0,
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Nothing is scheduled for today." }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("provides distinct loading and recoverable error states", () => {
    const retry = vi.fn();
    const { unmount } = render(<TodayLoading />);

    expect(screen.getByText("Gathering your habits…")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading today's habits")).toBeInTheDocument();
    unmount();

    render(<TodayError error={new Error("offline")} retry={retry} />);
    expect(
      screen.getByRole("heading", {
        name: "Today's habits could not be loaded.",
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
