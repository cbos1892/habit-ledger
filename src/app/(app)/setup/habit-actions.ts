"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  validateHabitForm,
  type HabitFormErrors,
  type HabitFormValues,
} from "@/lib/habit-form";
import { requireCurrentUser } from "@/lib/auth/current-user";
import {
  validateRoutineForm,
  type RoutineFormErrors,
  type RoutineFormValues,
} from "@/lib/routine-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type HabitFormState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      errors: HabitFormErrors;
      values: HabitFormValues;
    };

export type RoutineFormState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      errors: RoutineFormErrors;
      values: RoutineFormValues;
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

function readRoutineId(formData: FormData) {
  const value = formData.get("routineId");

  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Error("Invalid routine.");
  }

  return value;
}

function readOptionalRoutineId(formData: FormData) {
  const value = formData.get("routineId");
  if (value === "") return null;
  return readRoutineId(formData);
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

function routineFailure(
  values: RoutineFormValues,
  errors: RoutineFormErrors = {},
): RoutineFormState {
  return {
    status: "error",
    message:
      Object.keys(errors).length > 0
        ? "Check the routine name and try again."
        : "We couldn't save this routine right now. Your name is still here.",
    errors,
    values,
  };
}

function revalidateRoutineViews() {
  revalidatePath("/setup");
  revalidatePath("/today");
  revalidatePath("/week");
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
    const { error } = await supabase.rpc(
      "create_habit_with_schedule_and_routine",
      {
        p_color: validation.data.color,
        p_icon: validation.data.icon,
        p_name: validation.data.name,
        p_routine_id: validation.data.routineId,
        p_start_date: validation.data.startDate,
        p_weekdays: validation.data.weekdays,
      },
    );

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
    const { error } = await supabase.rpc(
      "update_habit_with_schedule_and_routine",
      {
        p_color: validation.data.color,
        p_habit_id: habitId,
        p_icon: validation.data.icon,
        p_name: validation.data.name,
        p_routine_id: validation.data.routineId,
        p_start_date: validation.data.startDate,
        p_weekdays: validation.data.weekdays,
      },
    );

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
  let destination = "/setup?habit=moved";

  await requireCurrentUser();
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("move_standalone_habit", {
      p_direction: direction,
      p_habit_id: habitId,
    });
    if (error) destination = "/setup?routine=habit-move-error";
  } catch {
    destination = "/setup?routine=habit-move-error";
  }

  revalidatePath("/setup");
  revalidatePath("/today");
  revalidatePath("/week");
  redirect(destination);
}

export async function createRoutine(
  _previousState: RoutineFormState,
  formData: FormData,
): Promise<RoutineFormState> {
  const validation = validateRoutineForm(formData);

  if (!validation.success) {
    return routineFailure(validation.values, validation.errors);
  }

  await requireCurrentUser();

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("create_routine", {
      p_icon: validation.data.icon,
      p_name: validation.data.name,
    });
    if (error) throw error;
  } catch {
    return routineFailure(validation.values);
  }

  revalidateRoutineViews();
  redirect("/setup?routine=created");
}

export async function renameRoutine(
  routineId: string,
  _previousState: RoutineFormState,
  formData: FormData,
): Promise<RoutineFormState> {
  const validation = validateRoutineForm(formData);

  if (!validation.success) {
    return routineFailure(validation.values, validation.errors);
  }

  await requireCurrentUser();

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("rename_routine", {
      p_icon: validation.data.icon,
      p_name: validation.data.name,
      p_routine_id: routineId,
    });
    if (error) throw error;
  } catch {
    return routineFailure(validation.values);
  }

  revalidateRoutineViews();
  redirect("/setup?routine=renamed");
}

export async function moveRoutine(formData: FormData): Promise<void> {
  const routineId = readRoutineId(formData);
  const direction = readDirection(formData);
  let outcome = "moved";

  await requireCurrentUser();
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("move_routine", {
      p_direction: direction,
      p_routine_id: routineId,
    });
    if (error) outcome = "move-error";
  } catch {
    outcome = "move-error";
  }

  revalidateRoutineViews();
  redirect(`/setup?routine=${outcome}`);
}

export async function deleteRoutine(formData: FormData): Promise<void> {
  const routineId = readRoutineId(formData);
  let outcome = "deleted";

  await requireCurrentUser();
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("delete_routine", {
      p_routine_id: routineId,
    });
    if (error) outcome = "delete-error";
  } catch {
    outcome = "delete-error";
  }

  revalidateRoutineViews();
  redirect(`/setup?routine=${outcome}`);
}

export async function setHabitRoutine(formData: FormData): Promise<void> {
  const habitId = readHabitId(formData);
  const routineId = readOptionalRoutineId(formData);
  let outcome = routineId ? "assigned" : "unassigned";

  await requireCurrentUser();
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = routineId
      ? await supabase.rpc("assign_habit_to_routine", {
          p_habit_id: habitId,
          p_routine_id: routineId,
        })
      : await supabase.rpc("unassign_habit_from_routine", {
          p_habit_id: habitId,
        });
    if (error) outcome = "membership-error";
  } catch {
    outcome = "membership-error";
  }

  revalidateRoutineViews();
  redirect(`/setup?routine=${outcome}`);
}

export async function moveRoutineHabit(formData: FormData): Promise<void> {
  const habitId = readHabitId(formData);
  const direction = readDirection(formData);
  let outcome = "habit-moved";

  await requireCurrentUser();
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("move_habit_in_routine", {
      p_direction: direction,
      p_habit_id: habitId,
    });
    if (error) outcome = "habit-move-error";
  } catch {
    outcome = "habit-move-error";
  }

  revalidateRoutineViews();
  redirect(`/setup?routine=${outcome}`);
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
