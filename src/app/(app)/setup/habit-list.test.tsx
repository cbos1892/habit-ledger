import { fireEvent, render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

import type { Routine } from "@/lib/habits";
import type { SetupSection } from "@/lib/routine-view-models";

import { HabitList } from "./habit-list";

const routines: Routine[] = [
  {
    display_order: 0,
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    name: "Morning reset",
  },
  {
    display_order: 1,
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    name: "Evening reset",
  },
];

const sections: SetupSection[] = [
  {
    activeHabits: [
      {
        archivedAt: null,
        color: "fern",
        displayOrder: 0,
        icon: "🚶🌿✨",
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        name: "Morning walk",
        routineDisplayOrder: null,
        startDate: "2026-08-10",
        weekdays: [1, 2, 3, 4, 5],
      },
    ],
    archivedHabits: [],
    kind: "standalone",
  },
  {
    activeHabits: [
      {
        archivedAt: null,
        color: "plum",
        displayOrder: 1,
        icon: "📚",
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        name: "Read",
        routineDisplayOrder: 0,
        startDate: "2026-08-10",
        weekdays: [1, 3, 5],
      },
    ],
    archivedHabits: [
      {
        archivedAt: "2026-08-11T20:00:00.000Z",
        color: "ocean",
        displayOrder: 2,
        icon: "🧘",
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        name: "Meditate",
        routineDisplayOrder: 1,
        startDate: "2026-07-01",
        weekdays: [7],
      },
    ],
    kind: "routine",
    routine: {
      displayOrder: 0,
      id: routines[0].id,
      name: routines[0].name,
    },
  },
  {
    activeHabits: [],
    archivedHabits: [],
    kind: "routine",
    routine: {
      displayOrder: 1,
      id: routines[1].id,
      name: routines[1].name,
    },
  },
];

function renderList() {
  const actions = {
    archiveAction: vi.fn(async () => undefined),
    deleteRoutineAction: vi.fn(async () => undefined),
    moveRoutineAction: vi.fn(async () => undefined),
    moveRoutineHabitAction: vi.fn(async () => undefined),
    moveStandaloneHabitAction: vi.fn(async () => undefined),
    renameRoutineAction: vi.fn(async () => ({ status: "idle" }) as const),
    restoreAction: vi.fn(async () => undefined),
    setHabitRoutineAction: vi.fn(async () => undefined),
  };

  const rendered = render(
    <HabitList routines={routines} sections={sections} {...actions} />,
  );

  return { ...actions, ...rendered };
}

describe("HabitList", () => {
  it("shows standalone habits first and visually separate routine containers", () => {
    renderList();

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map(({ textContent }) => textContent)).toEqual([
      "Standalone",
      "Morning reset",
      "Evening reset",
    ]);
    expect(screen.getByText("No active habits here yet.")).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: "New habit here" })[0],
    ).toHaveAttribute("href", `/setup/habits/new?routineId=${routines[0].id}`);
  });

  it("offers accessible routine and routine-local habit ordering", () => {
    renderList();

    expect(
      screen.getByRole("button", { name: "Move Morning reset routine up" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Move Morning reset routine down" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Move Read up" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Move Read down" }),
    ).toBeDisabled();
  });

  it("moves habits between standalone and named routines", () => {
    renderList();

    const morningWalkItem = screen.getByText("Morning walk").closest("li");
    expect(morningWalkItem).not.toBeNull();
    expect(
      within(morningWalkItem as HTMLElement).getByRole("combobox"),
    ).toHaveValue("");
    const readItem = screen.getByText("Read").closest("li");
    expect(readItem).not.toBeNull();
    expect(within(readItem as HTMLElement).getByRole("combobox")).toHaveValue(
      routines[0].id,
    );
  });

  it("requires an explicit history-preserving confirmation before deletion", () => {
    const { deleteRoutineAction } = renderList();
    vi.spyOn(window, "confirm").mockReturnValue(false);

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      "Delete Morning reset? Its habits will become standalone. Their schedules and history will be kept.",
    );
    expect(deleteRoutineAction).not.toHaveBeenCalled();
  });

  it("keeps archived habits out of active routine lists and restores them in context", () => {
    renderList();

    const archived = screen.getByText("Archived habits").closest("details");
    expect(archived).not.toBeNull();
    expect(within(archived as HTMLElement).getByText("Meditate")).toBeVisible();
    expect(
      within(archived as HTMLElement).getByText("Morning reset routine"),
    ).toBeVisible();
    expect(
      within(archived as HTMLElement).getByRole("button", { name: "Restore" }),
    ).toBeEnabled();
  });

  it("has no detectable structural accessibility violations", async () => {
    const { container } = renderList();

    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations.map(({ id }) => id)).toEqual([]);
  });
});
