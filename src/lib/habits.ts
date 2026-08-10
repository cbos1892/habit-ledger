import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Habit = Pick<
  Tables<"habits">,
  "id" | "name" | "icon" | "color" | "start_date" | "display_order"
>;

const habitSelection =
  "id, name, icon, color, start_date, display_order" as const;

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

  return data ?? [];
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

  return data;
}
