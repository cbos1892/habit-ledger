"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isWeekStartsOn, type WeekStartsOn } from "@/lib/time-zone";

export type WeekStartFormState =
  | { status: "idle" }
  | { status: "saved"; weekStartsOn: WeekStartsOn }
  | { status: "error"; message: string; weekStartError?: string };

export async function updateWeekStart(
  _previousState: WeekStartFormState,
  formData: FormData,
): Promise<WeekStartFormState> {
  const rawValue = formData.get("weekStartsOn");
  const weekStartsOn = rawValue === "0" ? 0 : rawValue === "1" ? 1 : null;

  if (!isWeekStartsOn(weekStartsOn)) {
    return {
      status: "error",
      message: "Your week layout wasn't saved.",
      weekStartError: "Choose Monday–Sunday or Sunday–Saturday.",
    };
  }

  const user = await requireCurrentUser();

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("profiles")
      .update({ week_starts_on: weekStartsOn })
      .eq("id", user.id);

    if (error) throw error;
  } catch {
    return {
      status: "error",
      message:
        "We couldn't save your week layout right now. Wait a moment and try again.",
    };
  }

  revalidatePath("/week");

  return { status: "saved", weekStartsOn };
}
