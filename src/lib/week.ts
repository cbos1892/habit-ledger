import "server-only";

import { isIsoWeekday } from "@/lib/habit-schedule";
import {
  buildWeeklyRoutineViewModel,
  type RoutineHabitRecord,
  type RoutineRecord,
  type WeeklyHabitCell,
  type WeeklyHabitCellState,
  type WeeklyHabitRow,
  type WeeklyRoutineViewModel,
} from "@/lib/routine-view-models";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getLocalWeekDateKeysFromDate,
  getLocalWeekStartDate,
  toLocalDateKey,
  type WeekStartsOn,
} from "@/lib/time-zone";
import type { Tables } from "@/types/database";

export type { WeeklyHabitCell, WeeklyHabitCellState, WeeklyHabitRow };

export type WeeklyViewModel = Readonly<
  WeeklyRoutineViewModel & {
    currentLocalDate: string;
    endDate: string;
    startDate: string;
  }
>;

export type WeeklyViewOptions = Readonly<{
  instant?: Date | number | string;
  selectedWeekStart?: string;
  weekStartsOn?: WeekStartsOn;
}>;

const weeklyHabitSelection =
  "id, name, icon, color, start_date, archived_at, display_order, routine_id, routine_display_order, routines(id, name, display_order), habit_schedules(weekday), completions(id, local_date)" as const;

type WeeklyHabitRecord = Pick<
  Tables<"habits">,
  | "archived_at"
  | "color"
  | "display_order"
  | "icon"
  | "id"
  | "name"
  | "routine_display_order"
  | "routine_id"
  | "start_date"
> & {
  completions: Pick<Tables<"completions">, "id" | "local_date">[];
  habit_schedules: { weekday: number }[];
  routines: Pick<Tables<"routines">, "display_order" | "id" | "name"> | null;
};

function normalizeHabit(habit: WeeklyHabitRecord): RoutineHabitRecord {
  return {
    archived_at: habit.archived_at,
    color: habit.color,
    completions: habit.completions,
    display_order: habit.display_order,
    icon: habit.icon,
    id: habit.id,
    name: habit.name,
    routine_display_order: habit.routine_display_order ?? null,
    routine_id: habit.routine_id ?? null,
    start_date: habit.start_date,
    weekdays: habit.habit_schedules
      .map(({ weekday }) => weekday)
      .filter(isIsoWeekday),
  };
}

function getJoinedRoutines(
  habits: readonly WeeklyHabitRecord[],
): RoutineRecord[] {
  return [
    ...new Map(
      habits.flatMap(({ routines }) =>
        routines ? [[routines.id, routines] as const] : [],
      ),
    ).values(),
  ];
}

export async function getWeeklyViewModel(
  ownerId: string,
  timeZone: string,
  options: WeeklyViewOptions = {},
): Promise<WeeklyViewModel> {
  const { instant = new Date(), selectedWeekStart, weekStartsOn = 1 } = options;
  const currentLocalDate = toLocalDateKey(instant, timeZone);
  const currentWeekStart = getLocalWeekStartDate(
    currentLocalDate,
    weekStartsOn,
  );
  let startDate = currentWeekStart;

  if (selectedWeekStart && selectedWeekStart <= currentWeekStart) {
    try {
      if (
        getLocalWeekStartDate(selectedWeekStart, weekStartsOn) ===
        selectedWeekStart
      ) {
        startDate = selectedWeekStart;
      }
    } catch {
      // Invalid URL values deliberately fall back to the current local week.
    }
  }

  const localDates = getLocalWeekDateKeysFromDate(startDate, weekStartsOn);
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
  const grouped = buildWeeklyRoutineViewModel(
    getJoinedRoutines(habits),
    habits.map(normalizeHabit),
    localDates,
    timeZone,
    weekStartsOn,
  );

  return Object.freeze({
    ...grouped,
    currentLocalDate,
    endDate,
    startDate,
  });
}
