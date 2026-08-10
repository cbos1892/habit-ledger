"use server";

import { refresh } from "next/cache";

import { isHabitScheduledAt, isIsoWeekday } from "@/lib/habit-schedule";
import { requireConfiguredProfile } from "@/lib/profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toLocalDateKey } from "@/lib/time-zone";

export type CompletionActionResult =
  | Readonly<{
      status: "success";
      habitId: string;
      completed: boolean;
      completionId: string | null;
      localDate: string;
    }>
  | Readonly<{
      status: "error";
      message: string;
    }>;

const habitIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const persistenceFailure = (): CompletionActionResult => ({
  status: "error",
  message: "We couldn't update this habit. Your previous check-in is restored.",
});

export async function setHabitCompletion(
  habitId: string,
  completed: boolean,
): Promise<CompletionActionResult> {
  if (!habitIdPattern.test(habitId) || typeof completed !== "boolean") {
    return persistenceFailure();
  }

  const profile = await requireConfiguredProfile();
  const instant = new Date();
  const localDate = toLocalDateKey(instant, profile.time_zone);

  try {
    const supabase = await createServerSupabaseClient();
    const { data: habit, error: habitError } = await supabase
      .from("habits")
      .select("id, start_date, habit_schedules(weekday)")
      .eq("id", habitId)
      .eq("owner_id", profile.id)
      .is("archived_at", null)
      .maybeSingle();

    if (
      habitError ||
      !habit ||
      !isHabitScheduledAt(
        {
          startDate: habit.start_date,
          weekdays: habit.habit_schedules
            .map(({ weekday }) => weekday)
            .filter(isIsoWeekday),
        },
        instant,
        profile.time_zone,
      )
    ) {
      return persistenceFailure();
    }

    if (completed) {
      const { error } = await supabase.from("completions").upsert(
        {
          habit_id: habitId,
          local_date: localDate,
          owner_id: profile.id,
        },
        {
          ignoreDuplicates: true,
          onConflict: "habit_id,local_date",
        },
      );

      if (error) return persistenceFailure();
    } else {
      const { error } = await supabase
        .from("completions")
        .delete()
        .eq("habit_id", habitId)
        .eq("owner_id", profile.id)
        .eq("local_date", localDate);

      if (error) return persistenceFailure();
    }

    const { data: completion, error: completionError } = await supabase
      .from("completions")
      .select("id")
      .eq("habit_id", habitId)
      .eq("owner_id", profile.id)
      .eq("local_date", localDate)
      .maybeSingle();

    if (completionError || (completion !== null) !== completed) {
      return persistenceFailure();
    }

    refresh();

    return {
      status: "success",
      habitId,
      completed,
      completionId: completion?.id ?? null,
      localDate,
    };
  } catch {
    return persistenceFailure();
  }
}
