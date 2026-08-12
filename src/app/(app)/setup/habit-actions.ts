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

type HabitDirection = "down" | "up";

function readHabitId(formData: FormData) {
  const value = formData.get("habitId");

  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Error("Invalid habit.");
  }

  return value;
}

function readDirection(formData: FormData): HabitDirection {
  const value = formData.get("direction");
  if (value !== "up" && value !== "down") {
    throw new Error("Invalid move direction.");
  }
  return value;
}

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

export async function moveHabit(formData: FormData): Promise<void> {
  const habitId = readHabitId(formData);
  const direction = readDirection(formData);

  await requireCurrentUser();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("move_habit", {
    p_direction: direction,
    p_habit_id: habitId,
  });

  if (error) throw new Error("Unable to reorder this habit.");

  revalidatePath("/setup");
  revalidatePath("/today");
  revalidatePath("/week");
  redirect("/setup?habit=moved");
}

export async function archiveHabit(formData: FormData): Promise<void> {
  const habitId = readHabitId(formData);

  await requireCurrentUser();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("archive_habit", {
    p_habit_id: habitId,
  });

  if (error) throw new Error("Unable to archive this habit.");

  revalidatePath("/setup");
  revalidatePath("/today");
  revalidatePath("/week");
  redirect("/setup?habit=archived");
}

export async function restoreHabit(formData: FormData): Promise<void> {
  const habitId = readHabitId(formData);

  await requireCurrentUser();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("restore_habit", {
    p_habit_id: habitId,
  });

  if (error) throw new Error("Unable to restore this habit.");

  revalidatePath("/setup");
  revalidatePath("/today");
  revalidatePath("/week");
  redirect("/setup?habit=restored");
}
