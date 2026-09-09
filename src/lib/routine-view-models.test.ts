import { describe, expect, it } from "vitest";

import type { IsoWeekday } from "@/lib/habit-schedule";

import {
  buildSetupRoutineViewModel,
  buildTodayRoutineViewModel,
  buildWeeklyRoutineViewModel,
  type RoutineHabitRecord,
  type RoutineRecord,
} from "./routine-view-models";

const routines: readonly RoutineRecord[] = [
  { id: "routine-evening", name: "Evening reset", display_order: 20 },
  { id: "routine-morning", name: "Morning start", display_order: 10 },
];

function habit(
  overrides: Partial<RoutineHabitRecord> &
    Pick<RoutineHabitRecord, "id" | "name">,
): RoutineHabitRecord {
  return {
    archived_at: null,
    color: "fern",
    completions: [],
    display_order: 100,
    icon: "✓",
    routine_display_order: null,
    routine_id: null,
    start_date: "2026-08-01",
    weekdays: [1, 2, 3, 4, 5, 6, 7] as IsoWeekday[],
    ...overrides,
  };
}

describe("routine view-model builders", () => {
  it("builds Setup standalone and routine sections with active and archived members in saved order", () => {
    const result = buildSetupRoutineViewModel(routines, [
      habit({ id: "solo", name: "Solo", display_order: 5 }),
      habit({
        archived_at: "2026-08-08T15:00:00.000Z",
        id: "solo-archived",
        name: "Archived solo",
        display_order: 7,
        start_date: "2026-07-01",
        weekdays: [2, 4],
      }),
      habit({
        id: "morning-last",
        name: "Last",
        routine_id: "routine-morning",
        routine_display_order: 2,
      }),
      habit({
        id: "morning-first",
        name: "First",
        routine_id: "routine-morning",
        routine_display_order: 1,
      }),
      habit({
        archived_at: "2026-08-09T15:00:00.000Z",
        id: "morning-archived",
        name: "Archived",
        routine_id: "routine-morning",
        routine_display_order: 3,
      }),
      habit({
        id: "unresolved-membership",
        name: "Still standalone",
        routine_id: "routine-not-loaded",
        display_order: 6,
      }),
    ]);

    expect(result).toEqual({
      status: "ready",
      sections: [
        {
          kind: "standalone",
          activeHabits: [
            expect.objectContaining({ id: "solo" }),
            expect.objectContaining({ id: "unresolved-membership" }),
          ],
          archivedHabits: [
            expect.objectContaining({
              archivedAt: "2026-08-08T15:00:00.000Z",
              id: "solo-archived",
              startDate: "2026-07-01",
              weekdays: [2, 4],
            }),
          ],
        },
        {
          kind: "routine",
          routine: {
            id: "routine-morning",
            name: "Morning start",
            displayOrder: 10,
          },
          activeHabits: [
            expect.objectContaining({
              id: "morning-first",
              routineDisplayOrder: 1,
            }),
            expect.objectContaining({
              id: "morning-last",
              routineDisplayOrder: 2,
            }),
          ],
          archivedHabits: [expect.objectContaining({ id: "morning-archived" })],
        },
        {
          kind: "routine",
          routine: {
            id: "routine-evening",
            name: "Evening reset",
            displayOrder: 20,
          },
          activeHabits: [],
          archivedHabits: [],
        },
      ],
    });
  });

  it("builds Today in standalone-then-routine order, using the local date and derived progress", () => {
    const result = buildTodayRoutineViewModel(
      routines,
      [
        habit({
          id: "solo-complete",
          name: "Solo complete",
          display_order: 1,
          weekdays: [1],
          completions: [{ id: "done", local_date: "2026-08-10" }],
        }),
        habit({
          id: "morning-applicable",
          name: "Morning applicable",
          routine_id: "routine-morning",
          routine_display_order: 1,
          weekdays: [1],
        }),
        habit({
          id: "evening-tuesday-only",
          name: "Evening Tuesday",
          routine_id: "routine-evening",
          routine_display_order: 1,
          weekdays: [2],
        }),
        habit({
          archived_at: "2026-08-10T12:00:00.000Z",
          id: "archived",
          name: "Archived",
          weekdays: [1],
        }),
      ],
      "America/New_York",
      "2026-08-11T02:30:00.000Z",
    );

    expect(result).toMatchObject({
      localDate: "2026-08-10",
      status: "ready",
      completedCount: 1,
      totalCount: 2,
      progress: { completedCount: 1, totalCount: 2 },
    });
    expect(result.sections).toEqual([
      {
        kind: "standalone",
        habits: [
          expect.objectContaining({
            id: "solo-complete",
            completed: true,
            completionId: "done",
          }),
        ],
        progress: { completedCount: 1, totalCount: 1 },
      },
      {
        kind: "routine",
        routine: expect.objectContaining({ id: "routine-morning" }),
        habits: [
          expect.objectContaining({
            id: "morning-applicable",
            completed: false,
          }),
        ],
        progress: { completedCount: 0, totalCount: 1 },
      },
    ]);
    expect(
      result.sections.flatMap(({ habits }) => habits.map(({ id }) => id)),
    ).toEqual(["solo-complete", "morning-applicable"]);
  });

  it("omits empty Today sections and preserves the local-date boundary", () => {
    const result = buildTodayRoutineViewModel(
      routines,
      [
        habit({
          id: "tomorrow",
          name: "Tomorrow",
          routine_id: "routine-morning",
          weekdays: [2],
        }),
      ],
      "Asia/Tokyo",
      "2026-08-10T16:30:00.000Z",
    );

    expect(result).toMatchObject({
      localDate: "2026-08-11",
      status: "ready",
      totalCount: 1,
    });
    expect(result.sections[0]).toMatchObject({
      kind: "routine",
      routine: { id: "routine-morning" },
    });
  });

  it("builds weekly standalone rows before routine groups, retaining seven cells and archive history", () => {
    const dates = [
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
    ];
    const result = buildWeeklyRoutineViewModel(
      routines,
      [
        habit({ id: "solo", name: "Solo", display_order: 1, weekdays: [1] }),
        habit({
          id: "morning",
          name: "Morning",
          routine_id: "routine-morning",
          routine_display_order: 1,
          weekdays: [3],
          completions: [{ id: "complete", local_date: "2026-08-05" }],
        }),
        habit({
          archived_at: "2026-08-05T16:00:00.000Z",
          id: "evening-archived",
          name: "Evening archived",
          routine_id: "routine-evening",
          routine_display_order: 1,
          weekdays: [2, 4],
        }),
        habit({
          id: "not-applicable",
          name: "Never this week",
          routine_id: "routine-evening",
          routine_display_order: 2,
          start_date: "2026-08-10",
          weekdays: [1],
        }),
      ],
      dates,
      "America/New_York",
      1,
    );

    expect(result.sections.map(({ kind }) => kind)).toEqual([
      "standalone",
      "routine",
      "routine",
    ]);
    expect(result.sections[0]).toMatchObject({
      kind: "standalone",
      rows: [expect.objectContaining({ id: "solo" })],
    });
    expect(result.sections[1]).toMatchObject({
      kind: "routine",
      routine: { id: "routine-morning" },
      rows: [expect.objectContaining({ id: "morning" })],
    });
    expect(result.sections[2]).toMatchObject({
      kind: "routine",
      routine: { id: "routine-evening" },
      rows: [expect.objectContaining({ id: "evening-archived" })],
    });

    const archivedRow = result.sections[2]?.rows[0];
    expect(archivedRow?.cells).toHaveLength(7);
    expect(archivedRow?.cells.map(({ state }) => state)).toEqual([
      "not-scheduled",
      "incomplete",
      "not-scheduled",
      "not-scheduled",
      "not-scheduled",
      "not-scheduled",
      "not-scheduled",
    ]);
    expect(
      result.sections.flatMap(({ rows }) => rows.map(({ id }) => id)),
    ).toEqual(["solo", "morning", "evening-archived"]);
  });

  it("keeps completion history visible even when a habit was archived before the selected week", () => {
    const result = buildWeeklyRoutineViewModel(
      routines,
      [
        habit({
          archived_at: "2026-07-31T12:00:00.000Z",
          completions: [{ id: "historical", local_date: "2026-08-06" }],
          id: "history",
          name: "History",
          routine_id: "routine-morning",
          weekdays: [1],
        }),
      ],
      [
        "2026-08-03",
        "2026-08-04",
        "2026-08-05",
        "2026-08-06",
        "2026-08-07",
        "2026-08-08",
        "2026-08-09",
      ],
      "UTC",
      1,
    );

    expect(result.sections[0]).toMatchObject({ kind: "routine" });
    expect(result.sections[0]?.rows[0]?.cells[3]).toEqual({
      completionId: "historical",
      localDate: "2026-08-06",
      state: "completed",
    });
  });

  it("returns frozen DTOs and rejects malformed weekly ranges", () => {
    const setup = buildSetupRoutineViewModel(
      [],
      [habit({ id: "solo", name: "Solo" })],
    );
    expect(Object.isFrozen(setup)).toBe(true);
    expect(Object.isFrozen(setup.sections)).toBe(true);
    expect(Object.isFrozen(setup.sections[0])).toBe(true);
    expect(
      Object.isFrozen(
        (
          setup.sections[0] as Extract<
            (typeof setup.sections)[number],
            { kind: "standalone" }
          >
        ).activeHabits,
      ),
    ).toBe(true);

    expect(() =>
      buildWeeklyRoutineViewModel([], [], ["2026-08-03"], "UTC", 1),
    ).toThrow("exactly seven");
  });
});
