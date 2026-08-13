import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TodayError from "./error";
import TodayLoading from "./loading";
import { setHabitCompletion } from "./completion-actions";
import { TodayView } from "./today-view";

vi.mock("./completion-actions", () => ({
  setHabitCompletion: vi.fn(),
}));

const readyToday = {
  completedCount: 0,
  habits: [
    {
      id: "4d91111d-df1b-41f7-917f-a67a6ec1e20d",
      name: "Morning walk",
      icon: "🚶",
      color: "fern",
      completed: false,
      completionId: null,
      displayOrder: 0,
    },
  ],
  localDate: "2026-08-10",
  status: "ready" as const,
  timeZone: "America/New_York",
  totalCount: 1,
};

describe("Today view", () => {
  beforeEach(() => {
    vi.mocked(setHabitCompletion).mockReset();
  });

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
              icon: "🌿📚✨",
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
    expect(screen.getByText("🌿📚✨")).toBeInTheDocument();
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

    expect(screen.getByRole("status")).toHaveTextContent(
      "Gathering today's habits…",
    );
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
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

  it("shows completion and progress optimistically before persistence resolves", async () => {
    let resolveMutation:
      | ((value: Awaited<ReturnType<typeof setHabitCompletion>>) => void)
      | undefined;
    vi.mocked(setHabitCompletion).mockReturnValue(
      new Promise((resolve) => {
        resolveMutation = resolve;
      }),
    );
    render(<TodayView today={readyToday} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Morning walk, not complete" }),
    );

    expect(
      screen.getByRole("button", { name: "Morning walk, complete" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );

    await act(async () => {
      resolveMutation?.({
        status: "success",
        habitId: readyToday.habits[0].id,
        completed: true,
        completionId: "1ebf23fd-61d1-4d9a-a376-ebfd9ec8ba4e",
        localDate: "2026-08-10",
      });
    });
  });

  it("restores the prior state and shows a non-blocking write error", async () => {
    vi.mocked(setHabitCompletion).mockResolvedValue({
      status: "error",
      message:
        "We couldn't update this habit. Your previous check-in is restored.",
    });
    render(<TodayView today={readyToday} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Morning walk, not complete" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "previous check-in is restored",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Morning walk, not complete" }),
      ).toHaveAttribute("aria-pressed", "false"),
    );
  });

  it("does not show an undo action or success notice after completion", async () => {
    vi.mocked(setHabitCompletion).mockResolvedValue({
      status: "success",
      habitId: readyToday.habits[0].id,
      completed: true,
      completionId: "1ebf23fd-61d1-4d9a-a376-ebfd9ec8ba4e",
      localDate: "2026-08-10",
    });
    render(<TodayView today={readyToday} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Morning walk, not complete" }),
    );

    await waitFor(() => expect(setHabitCompletion).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /undo completion/i }),
    ).not.toBeInTheDocument();
  });

  it("turns rapid repeated taps into ordered, idempotent target states", async () => {
    const resolvers: Array<
      (value: Awaited<ReturnType<typeof setHabitCompletion>>) => void
    > = [];
    vi.mocked(setHabitCompletion).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }),
    );
    render(<TodayView today={readyToday} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Morning walk, not complete" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Morning walk, complete" }),
    );

    expect(setHabitCompletion).toHaveBeenNthCalledWith(
      1,
      readyToday.habits[0].id,
      true,
    );
    expect(setHabitCompletion).toHaveBeenNthCalledWith(
      2,
      readyToday.habits[0].id,
      false,
    );
    expect(
      screen.getByRole("button", { name: "Morning walk, not complete" }),
    ).toHaveAttribute("aria-pressed", "false");

    await act(async () => {
      resolvers[0]?.({
        status: "success",
        habitId: readyToday.habits[0].id,
        completed: true,
        completionId: "1ebf23fd-61d1-4d9a-a376-ebfd9ec8ba4e",
        localDate: "2026-08-10",
      });
      resolvers[1]?.({
        status: "success",
        habitId: readyToday.habits[0].id,
        completed: false,
        completionId: null,
        localDate: "2026-08-10",
      });
    });
  });
});
