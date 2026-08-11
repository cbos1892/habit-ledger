import "server-only";

import {
  isHabitScheduledOnDate,
  isIsoWeekday,
  type IsoWeekday,
} from "@/lib/habit-schedule";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getLocalWeekDateKeys, toLocalDateKey } from "@/lib/time-zone";
import type { Tables } from "@/types/database";

type WeeklyHabitIdentity = Pick<
  Tables<"habits">,
  "id" | "name" | "icon" | "color"
>;

export type WeeklyHabitCellState = "completed" | "incomplete" | "not-scheduled";

export type WeeklyHabitCell = Readonly<{
  completionId: string | null;
  localDate: string;
  state: WeeklyHabitCellState;
}>;

export type WeeklyHabitRow = Readonly<
  WeeklyHabitIdentity & {
    cells: readonly WeeklyHabitCell[];
    displayOrder: number;
  }
>;

type WeeklyViewModelBase = Readonly<{
  endDate: string;
  localDates: readonly string[];
  startDate: string;
  timeZone: string;
  weekStartsOn: 0 | 1;
}>;

export type WeeklyViewModel =
  | (WeeklyViewModelBase &
      Readonly<{
        rows: readonly [];
        status: "empty";
      }>)
  | (WeeklyViewModelBase &
      Readonly<{
        rows: readonly WeeklyHabitRow[];
        status: "ready";
      }>);

const weeklyHabitSelection =
  "id, name, icon, color, start_date, archived_at, display_order, habit_schedules(weekday), completions(id, local_date)" as const;

type WeeklyHabitRecord = Pick<
  Tables<"habits">,
  | "id"
  | "name"
  | "icon"
  | "color"
  | "start_date"
  | "archived_at"
  | "display_order"
> & {
  completions: Pick<Tables<"completions">, "id" | "local_date">[];
  habit_schedules: { weekday: number }[];
};

type CompletionIdentity = Pick<Tables<"completions">, "id" | "local_date">;

function indexCompletions(
  habits: readonly WeeklyHabitRecord[],
): ReadonlyMap<string, ReadonlyMap<string, CompletionIdentity>> {
  return new Map(
    habits.map((habit) => [
      habit.id,
      new Map(
        habit.completions.map((completion) => [
          completion.local_date,
          completion,
        ]),
      ),
    ]),
  );
}

function getScheduledWeekdays(habit: WeeklyHabitRecord): IsoWeekday[] {
  return habit.habit_schedules
    .map(({ weekday }) => weekday)
    .filter(isIsoWeekday);
}

function createCell(
  habit: WeeklyHabitRecord,
  localDate: string,
  weekdays: readonly IsoWeekday[],
  archivedLocalDate: string | null,
  completions: ReadonlyMap<string, CompletionIdentity>,
): WeeklyHabitCell {
  const completion = completions.get(localDate);

  if (completion) {
    return Object.freeze({
      completionId: completion.id,
      localDate,
      state: "completed",
    });
  }

  const activeOnDate =
    archivedLocalDate === null || localDate <= archivedLocalDate;
  const scheduled =
    activeOnDate &&
    isHabitScheduledOnDate(
      { startDate: habit.start_date, weekdays },
      localDate,
    );

  return Object.freeze({
    completionId: null,
    localDate,
    state: scheduled ? "incomplete" : "not-scheduled",
  });
}

export async function getWeeklyViewModel(
  ownerId: string,
  timeZone: string,
  instant: Date | number | string = new Date(),
  weekStartsOn: 0 | 1 = 1,
): Promise<WeeklyViewModel> {
  const localDates = getLocalWeekDateKeys(instant, timeZone, weekStartsOn);
  const startDate = localDates[0];
  const endDate = localDates[6];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("habits")
    .select(weeklyHabitSelection)
    .eq("owner_id", ownerId)
    .lte("start_date", endDate)
    .gte("completions.local_date", startDate)
    .lte("completions.local_date", endDate)
    .order("display_order")
    .order("id");

  if (error) throw new Error("Unable to load the weekly habits.");

  const habits = (data ?? []) as WeeklyHabitRecord[];
  const completionsByHabitAndDate = indexCompletions(habits);
  const rows = habits.flatMap((habit): WeeklyHabitRow[] => {
    const archivedLocalDate = habit.archived_at
      ? toLocalDateKey(habit.archived_at, timeZone)
      : null;
    const weekdays = getScheduledWeekdays(habit);
    const completions = completionsByHabitAndDate.get(habit.id) ?? new Map();
    const cells = Object.freeze(
      localDates.map((localDate) =>
        createCell(habit, localDate, weekdays, archivedLocalDate, completions),
      ),
    );

    if (cells.every(({ state }) => state === "not-scheduled")) return [];

    return [
      Object.freeze({
        id: habit.id,
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        cells,
        displayOrder: habit.display_order,
      }),
    ];
  });

  const shared = {
    endDate,
    localDates,
    startDate,
    timeZone,
    weekStartsOn,
  };

  if (rows.length === 0) {
    return Object.freeze({
      ...shared,
      rows: Object.freeze([] as const),
      status: "empty",
    });
  }

  return Object.freeze({
    ...shared,
    rows: Object.freeze(rows),
    status: "ready",
  });
}
