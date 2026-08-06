"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupportedTimeZone } from "@/lib/time-zone";

export type TimeZoneFormState =
  | { status: "idle" }
  | { status: "saved"; timeZone: string }
  | { status: "error"; message: string; timeZoneError?: string };

export async function updateTimeZone(
  _previousState: TimeZoneFormState,
  formData: FormData,
): Promise<TimeZoneFormState> {
  const value = formData.get("timeZone");
  const timeZone = typeof value === "string" ? value.trim() : "";
  const mode = formData.get("mode");

  if (!isSupportedTimeZone(timeZone)) {
    return {
      status: "error",
      message: "Your time zone wasn't saved.",
      timeZoneError:
        "Enter a supported IANA time zone, such as America/New_York.",
    };
  }

  const user = await requireCurrentUser();

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        time_zone: timeZone,
        time_zone_confirmed_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) throw error;
  } catch {
    return {
      status: "error",
      message:
        "We couldn't save your time zone right now. Wait a moment and try again.",
    };
  }

  revalidatePath("/", "layout");

  if (mode === "onboarding") redirect("/today");

  return { status: "saved", timeZone };
}
