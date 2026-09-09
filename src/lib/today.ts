import "server-only";

import { isIsoWeekday } from "@/lib/habit-schedule";
import {
  buildTodayRoutineViewModel,
  type RoutineHabitRecord,
  type RoutineRecord,
  type TodayHabit,
  type TodayRoutineViewModel,
} from "@/lib/routine-view-models";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toLocalDateKey } from "@/lib/time-zone";
import type { Tables } from "@/types/database";

export type { TodayHabit };
export type TodayViewModel = TodayRoutineViewModel;

const todayHabitSelection =
  "id, name, icon, color, start_date, archived_at, display_order, routine_id, routine_display_order, routines(id, name, display_order), habit_schedules(weekday), completions(id, local_date)" as const;

type TodayHabitRecord = Pick<
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

function normalizeHabit(habit: TodayHabitRecord): RoutineHabitRecord {
  return {
    archived_at: habit.archived_at ?? null,
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
  habits: readonly TodayHabitRecord[],
): RoutineRecord[] {
  return [
    ...new Map(
      habits.flatMap(({ routines }) =>
        routines ? [[routines.id, routines] as const] : [],
      ),
    ).values(),
  ];
}

export async function getTodayViewModel(
  ownerId: string,
  timeZone: string,
  instant: Date | number | string = new Date(),
): Promise<TodayViewModel> {
  const localDate = toLocalDateKey(instant, timeZone);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("habits")
    .select(todayHabitSelection)
    .eq("owner_id", ownerId)
    .is("archived_at", null)
    .eq("completions.local_date", localDate)
    .order("display_order")
    .order("id");

  if (error) throw new Error("Unable to load today's habits.");

  const habits = (data ?? []) as TodayHabitRecord[];

  return buildTodayRoutineViewModel(
    getJoinedRoutines(habits),
    habits.map(normalizeHabit),
    timeZone,
    instant,
  );
}
