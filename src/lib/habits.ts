import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isIsoWeekday, type IsoWeekday } from "@/lib/habit-schedule";
import {
  buildSetupRoutineViewModel,
  type SetupRoutineViewModel,
} from "@/lib/routine-view-models";
import type { Tables } from "@/types/database";

export type Habit = Pick<
  Tables<"habits">,
  | "id"
  | "name"
  | "icon"
  | "color"
  | "start_date"
  | "display_order"
  | "archived_at"
> & {
  routine_id?: string | null;
  routine_display_order?: number | null;
  weekdays: IsoWeekday[];
};

export type Routine = Pick<
  Tables<"routines">,
  "display_order" | "id" | "name"
> & {
  icon?: string;
};

const habitSelection =
  "id, name, icon, color, start_date, display_order, archived_at, routine_id, routine_display_order, habit_schedules(weekday)" as const;

function withWeekdays(
  habit: Pick<
    Tables<"habits">,
    | "id"
    | "name"
    | "icon"
    | "color"
    | "start_date"
    | "display_order"
    | "archived_at"
    | "routine_id"
    | "routine_display_order"
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

export async function getSetupViewModel(
  ownerId: string,
): Promise<SetupRoutineViewModel> {
  const supabase = await createServerSupabaseClient();
  const [routineResult, habitResult] = await Promise.all([
    supabase
      .from("routines")
      .select("id, name, icon, display_order")
      .eq("owner_id", ownerId)
      .order("display_order")
      .order("id"),
    supabase
      .from("habits")
      .select(habitSelection)
      .eq("owner_id", ownerId)
      .order("display_order")
      .order("id"),
  ]);

  if (routineResult.error || habitResult.error) {
    throw new Error("Unable to load habit setup.");
  }

  return buildSetupRoutineViewModel(
    routineResult.data ?? [],
    (habitResult.data ?? []).map((habit) => ({
      ...withWeekdays(habit),
      completions: [],
      routine_display_order: habit.routine_display_order ?? null,
      routine_id: habit.routine_id ?? null,
    })),
  );
}

export async function getRoutines(ownerId: string): Promise<Routine[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("routines")
    .select("id, name, icon, display_order")
    .eq("owner_id", ownerId)
    .order("display_order")
    .order("id");

  if (error) throw new Error("Unable to load routines.");

  return data ?? [];
}

export async function getRoutine(
  ownerId: string,
  routineId: string,
): Promise<Routine | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("routines")
    .select("id, name, icon, display_order")
    .eq("id", routineId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) throw new Error("Unable to load this routine.");
  return data;
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

export async function getArchivedHabits(ownerId: string): Promise<Habit[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("habits")
    .select(habitSelection)
    .eq("owner_id", ownerId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })
    .order("id");

  if (error) throw new Error("Unable to load archived habits.");

  return (data ?? []).map(withWeekdays);
}
