import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Habit } from "@/lib/habits";

import { HabitList } from "./habit-list";

const activeHabits: Habit[] = [
  {
    archived_at: null,
    color: "fern",
    display_order: 0,
    icon: "🚶🌿✨",
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Morning walk",
    start_date: "2026-08-10",
    weekdays: [1, 2, 3, 4, 5],
  },
  {
    archived_at: null,
    color: "plum",
    display_order: 1,
    icon: "📚",
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    name: "Read",
    start_date: "2026-08-10",
    weekdays: [1, 3, 5],
  },
];

const archivedHabits: Habit[] = [
  {
    archived_at: "2026-08-11T20:00:00.000Z",
    color: "ocean",
    display_order: 2,
    icon: "🧘",
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    name: "Meditate",
    start_date: "2026-07-01",
    weekdays: [7],
  },
];

function renderList() {
  const actions = {
    archiveAction: vi.fn(async () => undefined),
    moveAction: vi.fn(async () => undefined),
    restoreAction: vi.fn(async () => undefined),
  };

  render(
    <HabitList
      activeHabits={activeHabits}
      archivedHabits={archivedHabits}
      {...actions}
    />,
  );

  return actions;
}

describe("HabitList", () => {
  it("renders active habits in order with accessible move controls", () => {
    renderList();

    const items = screen.getAllByRole("listitem");
    const morningControls = within(items[0]).getByRole("group", {
      name: "Controls for Morning walk",
    });
    expect(within(items[0]).getByText("Morning walk")).toBeVisible();
    expect(within(items[0]).getByText("🚶🌿✨")).toBeVisible();
    expect(
      within(morningControls).getByRole("button", {
        name: "Move Morning walk up",
      }),
    ).toBeDisabled();
    expect(
      within(morningControls).getByRole("button", {
        name: "Move Morning walk down",
      }),
    ).toBeEnabled();
    expect(
      within(morningControls).getByRole("link", { name: "Edit" }),
    ).toHaveAttribute("href", `/setup/habits/${activeHabits[0].id}/edit`);
    expect(
      within(morningControls).getByRole("button", { name: "Archive" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Move Read down" }),
    ).toBeDisabled();
  });

  it("requires confirmation before archiving", () => {
    const { archiveAction } = renderList();
    vi.spyOn(window, "confirm").mockReturnValue(false);

    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      "Archive Morning walk? Its completion history will be kept.",
    );
    expect(archiveAction).not.toHaveBeenCalled();
  });

  it("shows archived habits and offers restore", () => {
    renderList();

    const archivedControls = screen.getByRole("group", {
      name: "Controls for Meditate",
    });
    expect(screen.getByText("Archived habits")).toBeVisible();
    expect(screen.getByText("Meditate")).toBeVisible();
    expect(
      within(archivedControls).getByRole("button", { name: "Restore" }),
    ).toBeEnabled();
  });
});
