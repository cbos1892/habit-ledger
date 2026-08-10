"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  validateHabitForm,
  type HabitFormErrors,
  type HabitFormValues,
} from "@/lib/habit-form";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type HabitFormState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      errors: HabitFormErrors;
      values: HabitFormValues;
    };

function failure(
  values: HabitFormValues,
  errors: HabitFormErrors = {},
): HabitFormState {
  return {
    status: "error",
    message:
      Object.keys(errors).length > 0
        ? "Check the highlighted fields and try again."
        : "We couldn't save this habit right now. Your changes are still here.",
    errors,
    values,
  };
}

export async function createHabit(
  _previousState: HabitFormState,
  formData: FormData,
): Promise<HabitFormState> {
  const validation = validateHabitForm(formData);

  if (!validation.success) {
    return failure(validation.values, validation.errors);
  }

  await requireCurrentUser();

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("create_habit_with_schedule", {
      p_color: validation.data.color,
      p_icon: validation.data.icon,
      p_name: validation.data.name,
      p_start_date: validation.data.startDate,
      p_weekdays: validation.data.weekdays,
    });

    if (error) throw error;
  } catch {
    return failure(validation.values);
  }

  revalidatePath("/setup");
  redirect("/setup?habit=created");
}

export async function updateHabit(
  habitId: string,
  _previousState: HabitFormState,
  formData: FormData,
): Promise<HabitFormState> {
  const validation = validateHabitForm(formData);

  if (!validation.success) {
    return failure(validation.values, validation.errors);
  }

  await requireCurrentUser();

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("update_habit_with_schedule", {
      p_color: validation.data.color,
      p_habit_id: habitId,
      p_icon: validation.data.icon,
      p_name: validation.data.name,
      p_start_date: validation.data.startDate,
      p_weekdays: validation.data.weekdays,
    });

    if (error) throw error;
  } catch {
    return failure(validation.values);
  }

  revalidatePath("/setup");
  redirect("/setup?habit=updated");
}
