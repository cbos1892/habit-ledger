"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupportedTimeZone } from "@/lib/time-zone";
import {
  createTimeZoneCookieValue,
  TIME_ZONE_COOKIE_NAME,
  timeZoneCookieOptions,
} from "@/lib/time-zone-cookie";

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
        time_zone_source: "manual",
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
  const cookieValue = await createTimeZoneCookieValue(user.id, timeZone);

  if (cookieValue) {
    (await cookies()).set(
      TIME_ZONE_COOKIE_NAME,
      cookieValue,
      timeZoneCookieOptions,
    );
  }

  return { status: "saved", timeZone };
}
