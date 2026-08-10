import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isIsoWeekday, type IsoWeekday } from "@/lib/habit-schedule";
import type { Tables } from "@/types/database";

export type Habit = Pick<
  Tables<"habits">,
  "id" | "name" | "icon" | "color" | "start_date" | "display_order"
> & { weekdays: IsoWeekday[] };

const habitSelection =
  "id, name, icon, color, start_date, display_order, habit_schedules(weekday)" as const;

function withWeekdays(
  habit: Pick<
    Tables<"habits">,
    "id" | "name" | "icon" | "color" | "start_date" | "display_order"
  > & { habit_schedules: { weekday: number }[] },
): Habit {
  const { habit_schedules, ...identity } = habit;

  return {
    ...identity,
    weekdays: habit_schedules
      .map(({ weekday }) => weekday)
      .filter(isIsoWeekday)
      .sort((a, b) => a - b),
  };
}

export async function getActiveHabits(ownerId: string): Promise<Habit[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("habits")
    .select(habitSelection)
    .eq("owner_id", ownerId)
    .is("archived_at", null)
    .order("display_order")
    .order("id");

  if (error) throw new Error("Unable to load habits.");

  return (data ?? []).map(withWeekdays);
}

export async function getActiveHabit(
  ownerId: string,
  habitId: string,
): Promise<Habit | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("habits")
    .select(habitSelection)
    .eq("id", habitId)
    .eq("owner_id", ownerId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) throw new Error("Unable to load this habit.");

  return data ? withWeekdays(data) : null;
}
