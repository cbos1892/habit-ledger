import { isHabitScheduledOnDate, type IsoWeekday } from "@/lib/habit-schedule";
import { toLocalDateKey, type WeekStartsOn } from "@/lib/time-zone";

/** Database-shaped routine data required by the pure view-model builders. */
export type RoutineRecord = Readonly<{
  display_order: number;
  id: string;
  name: string;
}>;

export type RoutineCompletionRecord = Readonly<{
  id: string;
  local_date: string;
}>;

/**
 * A normalized habit record. Data loaders own authorization and convert joined
 * schedule rows to weekdays before calling this module.
 */
export type RoutineHabitRecord = Readonly<{
  archived_at: string | null;
  color: string;
  completions: readonly RoutineCompletionRecord[];
  display_order: number;
  icon: string;
  id: string;
  name: string;
  routine_display_order: number | null;
  routine_id: string | null;
  start_date: string;
  weekdays: readonly IsoWeekday[];
}>;

export type RoutineSummary = Readonly<{
  displayOrder: number;
  id: string;
  name: string;
}>;

export type RoutineHabit = Readonly<{
  color: string;
  displayOrder: number;
  icon: string;
  id: string;
  name: string;
  routineDisplayOrder: number | null;
}>;

export type SetupHabit = Readonly<
  RoutineHabit & {
    archivedAt: string | null;
    startDate: string;
    weekdays: readonly IsoWeekday[];
  }
>;

export type SetupSection =
  | Readonly<{
      activeHabits: readonly SetupHabit[];
      archivedHabits: readonly SetupHabit[];
      kind: "standalone";
    }>
  | Readonly<{
      activeHabits: readonly SetupHabit[];
      archivedHabits: readonly SetupHabit[];
      kind: "routine";
      routine: RoutineSummary;
    }>;

export type SetupRoutineViewModel = Readonly<{
  sections: readonly SetupSection[];
  status: "empty" | "ready";
}>;

export type TodayHabit = Readonly<
  RoutineHabit & {
    completed: boolean;
    completionId: string | null;
  }
>;

export type TodayProgress = Readonly<{
  completedCount: number;
  totalCount: number;
}>;

export type TodaySection =
  | Readonly<{
      habits: readonly TodayHabit[];
      kind: "standalone";
      progress: TodayProgress;
    }>
  | Readonly<{
      habits: readonly TodayHabit[];
      kind: "routine";
      progress: TodayProgress;
      routine: RoutineSummary;
    }>;

export type TodayRoutineViewModel = Readonly<{
  completedCount: number;
  localDate: string;
  progress: TodayProgress;
  sections: readonly TodaySection[];
  status: "empty" | "ready";
  timeZone: string;
  totalCount: number;
}>;

export type WeeklyHabitCellState = "completed" | "incomplete" | "not-scheduled";

export type WeeklyHabitCell = Readonly<{
  completionId: string | null;
  localDate: string;
  state: WeeklyHabitCellState;
}>;

export type WeeklyHabitRow = Readonly<
  RoutineHabit & {
    cells: readonly WeeklyHabitCell[];
  }
>;

export type WeeklySection =
  | Readonly<{
      kind: "standalone";
      rows: readonly WeeklyHabitRow[];
    }>
  | Readonly<{
      kind: "routine";
      routine: RoutineSummary;
      rows: readonly WeeklyHabitRow[];
    }>;

export type WeeklyRoutineViewModel = Readonly<{
  localDates: readonly string[];
  sections: readonly WeeklySection[];
  status: "empty" | "ready";
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}>;

function compareBySavedOrder(
  left: Pick<
    RoutineHabitRecord,
    "display_order" | "id" | "routine_display_order"
  >,
  right: Pick<
    RoutineHabitRecord,
    "display_order" | "id" | "routine_display_order"
  >,
): number {
  const leftOrder = left.routine_display_order ?? left.display_order;
  const rightOrder = right.routine_display_order ?? right.display_order;

  return (
    leftOrder - rightOrder ||
    left.display_order - right.display_order ||
    left.id.localeCompare(right.id)
  );
}

function compareRoutines(left: RoutineRecord, right: RoutineRecord): number {
  return (
    left.display_order - right.display_order || left.id.localeCompare(right.id)
  );
}

function toRoutineSummary(routine: RoutineRecord): RoutineSummary {
  return Object.freeze({
    displayOrder: routine.display_order,
    id: routine.id,
    name: routine.name,
  });
}

function toRoutineHabit(habit: RoutineHabitRecord): RoutineHabit {
  return Object.freeze({
    color: habit.color,
    displayOrder: habit.display_order,
    icon: habit.icon,
    id: habit.id,
    name: habit.name,
    routineDisplayOrder: habit.routine_display_order,
  });
}

function toSetupHabit(habit: RoutineHabitRecord): SetupHabit {
  return Object.freeze({
    ...toRoutineHabit(habit),
    archivedAt: habit.archived_at,
    startDate: habit.start_date,
    weekdays: Object.freeze([...habit.weekdays]),
  });
}

type GroupedHabits = Readonly<{
  byRoutineId: ReadonlyMap<string, readonly RoutineHabitRecord[]>;
  standalone: readonly RoutineHabitRecord[];
}>;

function groupHabits(
  routines: readonly RoutineRecord[],
  habits: readonly RoutineHabitRecord[],
): GroupedHabits {
  const routineIds = new Set(routines.map(({ id }) => id));
  const byRoutineId = new Map<string, RoutineHabitRecord[]>();
  const standalone: RoutineHabitRecord[] = [];

  for (const habit of habits) {
    if (habit.routine_id === null || !routineIds.has(habit.routine_id)) {
      standalone.push(habit);
      continue;
    }

    const members = byRoutineId.get(habit.routine_id) ?? [];
    members.push(habit);
    byRoutineId.set(habit.routine_id, members);
  }

  return Object.freeze({
    byRoutineId: new Map(
      [...byRoutineId].map(([routineId, members]) => [
        routineId,
        Object.freeze([...members].sort(compareBySavedOrder)),
      ]),
    ),
    standalone: Object.freeze([...standalone].sort(compareBySavedOrder)),
  });
}

export function buildSetupRoutineViewModel(
  routines: readonly RoutineRecord[],
  habits: readonly RoutineHabitRecord[],
): SetupRoutineViewModel {
  const orderedRoutines = [...routines].sort(compareRoutines);
  const grouped = groupHabits(orderedRoutines, habits);
  const sections: SetupSection[] = [];

  if (grouped.standalone.length > 0) {
    sections.push(
      Object.freeze({
        activeHabits: Object.freeze(
          grouped.standalone
            .filter(({ archived_at }) => archived_at === null)
            .map(toSetupHabit),
        ),
        archivedHabits: Object.freeze(
          grouped.standalone
            .filter(({ archived_at }) => archived_at !== null)
            .map(toSetupHabit),
        ),
        kind: "standalone",
      }),
    );
  }

  for (const routine of orderedRoutines) {
    const members = grouped.byRoutineId.get(routine.id) ?? [];
    sections.push(
      Object.freeze({
        activeHabits: Object.freeze(
          members
            .filter(({ archived_at }) => archived_at === null)
            .map(toSetupHabit),
        ),
        archivedHabits: Object.freeze(
          members
            .filter(({ archived_at }) => archived_at !== null)
            .map(toSetupHabit),
        ),
        kind: "routine",
        routine: toRoutineSummary(routine),
      }),
    );
  }

  return Object.freeze({
    sections: Object.freeze(sections),
    status: sections.length === 0 ? "empty" : "ready",
  });
}

function toTodayHabit(
  habit: RoutineHabitRecord,
  localDate: string,
): TodayHabit {
  const completion = habit.completions.find(
    ({ local_date }) => local_date === localDate,
  );

  return Object.freeze({
    ...toRoutineHabit(habit),
    completed: completion !== undefined,
    completionId: completion?.id ?? null,
  });
}

function toProgress(habits: readonly TodayHabit[]): TodayProgress {
  return Object.freeze({
    completedCount: habits.filter(({ completed }) => completed).length,
    totalCount: habits.length,
  });
}

function isActiveAndScheduledToday(
  habit: RoutineHabitRecord,
  localDate: string,
): boolean {
  return (
    habit.archived_at === null &&
    isHabitScheduledOnDate(
      { startDate: habit.start_date, weekdays: habit.weekdays },
      localDate,
    )
  );
}

export function buildTodayRoutineViewModel(
  routines: readonly RoutineRecord[],
  habits: readonly RoutineHabitRecord[],
  timeZone: string,
  instant: Date | number | string = new Date(),
): TodayRoutineViewModel {
  const localDate = toLocalDateKey(instant, timeZone);
  const orderedRoutines = [...routines].sort(compareRoutines);
  const grouped = groupHabits(orderedRoutines, habits);
  const sections: TodaySection[] = [];
  const standalone = Object.freeze(
    grouped.standalone
      .filter((habit) => isActiveAndScheduledToday(habit, localDate))
      .map((habit) => toTodayHabit(habit, localDate)),
  );

  if (standalone.length > 0) {
    sections.push(
      Object.freeze({
        kind: "standalone",
        habits: standalone,
        progress: toProgress(standalone),
      }),
    );
  }

  for (const routine of orderedRoutines) {
    const scheduled = Object.freeze(
      (grouped.byRoutineId.get(routine.id) ?? [])
        .filter((habit) => isActiveAndScheduledToday(habit, localDate))
        .map((habit) => toTodayHabit(habit, localDate)),
    );
    if (scheduled.length === 0) continue;

    sections.push(
      Object.freeze({
        habits: scheduled,
        kind: "routine",
        progress: toProgress(scheduled),
        routine: toRoutineSummary(routine),
      }),
    );
  }

  const allHabits = sections.flatMap(
    ({ habits: sectionHabits }) => sectionHabits,
  );
  const progress = toProgress(allHabits);

  return Object.freeze({
    completedCount: progress.completedCount,
    localDate,
    progress,
    sections: Object.freeze(sections),
    status: sections.length === 0 ? "empty" : "ready",
    timeZone,
    totalCount: progress.totalCount,
  });
}

function createWeeklyRow(
  habit: RoutineHabitRecord,
  localDates: readonly string[],
  timeZone: string,
): WeeklyHabitRow | null {
  const completionByDate = new Map(
    habit.completions.map((completion) => [completion.local_date, completion]),
  );
  const archivedLocalDate = habit.archived_at
    ? toLocalDateKey(habit.archived_at, timeZone)
    : null;
  const cells = Object.freeze(
    localDates.map((localDate): WeeklyHabitCell => {
      const completion = completionByDate.get(localDate);
      if (completion) {
        return Object.freeze({
          completionId: completion.id,
          localDate,
          state: "completed",
        });
      }

      const scheduled =
        (archivedLocalDate === null || localDate <= archivedLocalDate) &&
        isHabitScheduledOnDate(
          { startDate: habit.start_date, weekdays: habit.weekdays },
          localDate,
        );

      return Object.freeze({
        completionId: null,
        localDate,
        state: scheduled ? "incomplete" : "not-scheduled",
      });
    }),
  );

  if (cells.every(({ state }) => state === "not-scheduled")) return null;

  return Object.freeze({ ...toRoutineHabit(habit), cells });
}

export function buildWeeklyRoutineViewModel(
  routines: readonly RoutineRecord[],
  habits: readonly RoutineHabitRecord[],
  localDates: readonly string[],
  timeZone: string,
  weekStartsOn: WeekStartsOn,
): WeeklyRoutineViewModel {
  if (localDates.length !== 7) {
    throw new RangeError(
      "A weekly routine view requires exactly seven local dates.",
    );
  }

  const orderedRoutines = [...routines].sort(compareRoutines);
  const grouped = groupHabits(orderedRoutines, habits);
  const sections: WeeklySection[] = [];
  const standalone = Object.freeze(
    grouped.standalone.flatMap((habit) => {
      const row = createWeeklyRow(habit, localDates, timeZone);
      return row ? [row] : [];
    }),
  );

  if (standalone.length > 0) {
    sections.push(Object.freeze({ kind: "standalone", rows: standalone }));
  }

  for (const routine of orderedRoutines) {
    const rows = Object.freeze(
      (grouped.byRoutineId.get(routine.id) ?? []).flatMap((habit) => {
        const row = createWeeklyRow(habit, localDates, timeZone);
        return row ? [row] : [];
      }),
    );
    if (rows.length === 0) continue;

    sections.push(
      Object.freeze({
        kind: "routine",
        routine: toRoutineSummary(routine),
        rows,
      }),
    );
  }

  return Object.freeze({
    localDates: Object.freeze([...localDates]),
    sections: Object.freeze(sections),
    status: sections.length === 0 ? "empty" : "ready",
    timeZone,
    weekStartsOn,
  });
}
