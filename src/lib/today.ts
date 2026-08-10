import "server-only";

import { isHabitScheduledAt, isIsoWeekday } from "@/lib/habit-schedule";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toLocalDateKey } from "@/lib/time-zone";
import type { Tables } from "@/types/database";

type TodayHabitIdentity = Pick<
  Tables<"habits">,
  "id" | "name" | "icon" | "color"
>;

export type TodayHabit = Readonly<
  TodayHabitIdentity & {
    completed: boolean;
    completionId: string | null;
    displayOrder: number;
  }
>;

type TodayViewModelBase = Readonly<{
  completedCount: number;
  localDate: string;
  timeZone: string;
  totalCount: number;
}>;

export type TodayViewModel =
  | (TodayViewModelBase &
      Readonly<{
        habits: readonly [];
        status: "empty";
      }>)
  | (TodayViewModelBase &
      Readonly<{
        habits: readonly TodayHabit[];
        status: "ready";
      }>);

const todayHabitSelection =
  "id, name, icon, color, start_date, display_order, habit_schedules(weekday), completions(id, local_date)" as const;

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

  const habits = (data ?? [])
    .filter((habit) =>
      isHabitScheduledAt(
        {
          startDate: habit.start_date,
          weekdays: habit.habit_schedules
            .map(({ weekday }) => weekday)
            .filter(isIsoWeekday),
        },
        instant,
        timeZone,
      ),
    )
    .map((habit): TodayHabit => {
      const completion = habit.completions[0] ?? null;

      return Object.freeze({
        id: habit.id,
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        completed: completion !== null,
        completionId: completion?.id ?? null,
        displayOrder: habit.display_order,
      });
    });

  const completedCount = habits.filter(({ completed }) => completed).length;
  const shared = {
    completedCount,
    localDate,
    timeZone,
    totalCount: habits.length,
  };

  if (habits.length === 0) {
    return Object.freeze({
      ...shared,
      habits: Object.freeze([] as const),
      status: "empty",
    });
  }

  return Object.freeze({
    ...shared,
    habits: Object.freeze(habits),
    status: "ready",
  });
}
