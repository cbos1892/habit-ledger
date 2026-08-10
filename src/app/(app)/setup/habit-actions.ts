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

  const user = await requireCurrentUser();

  try {
    const supabase = await createServerSupabaseClient();
    const { data: lastHabit, error: orderError } = await supabase
      .from("habits")
      .select("display_order")
      .eq("owner_id", user.id)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderError) throw orderError;

    const { error } = await supabase.from("habits").insert({
      owner_id: user.id,
      name: validation.data.name,
      icon: validation.data.icon,
      color: validation.data.color,
      start_date: validation.data.startDate,
      display_order: (lastHabit?.display_order ?? -1) + 1,
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

  const user = await requireCurrentUser();

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("habits")
      .update({
        name: validation.data.name,
        icon: validation.data.icon,
        color: validation.data.color,
        start_date: validation.data.startDate,
      })
      .eq("id", habitId)
      .eq("owner_id", user.id)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();

    if (error || !data) throw error ?? new Error("Habit not found");
  } catch {
    return failure(validation.values);
  }

  revalidatePath("/setup");
  redirect("/setup?habit=updated");
}
