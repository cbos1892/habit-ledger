import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  readTimeZoneCookieValue,
  TIME_ZONE_COOKIE_NAME,
} from "@/lib/time-zone-cookie";
import { isWeekStartsOn, type WeekStartsOn } from "@/lib/time-zone";
import type { Tables } from "@/types/database";

export type Profile = Omit<
  Pick<
    Tables<"profiles">,
    | "id"
    | "time_zone"
    | "time_zone_confirmed_at"
    | "time_zone_source"
    | "week_starts_on"
  >,
  "week_starts_on"
> &
  Readonly<{ week_starts_on: WeekStartsOn }>;

export type TimeZoneContext = Readonly<{
  id: string;
  time_zone: string;
}>;

export const getProfile = cache(async (userId: string): Promise<Profile> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, time_zone, time_zone_confirmed_at, time_zone_source, week_starts_on",
    )
    .eq("id", userId)
    .single();

  if (error || !data || !isWeekStartsOn(data.week_starts_on)) {
    throw new Error("Unable to load the current user's profile.");
  }

  return Object.freeze({ ...data, week_starts_on: data.week_starts_on });
});

// React cache is scoped to the current server render. This deduplicates a
// layout gate and a page data read without retaining private data across users.
export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const user = await requireCurrentUser();

  return getProfile(user.id);
});

// Authentication and ownership always come from verified claims. The signed
// cookie only avoids a profile read for the user's local-calendar context.
export const getCurrentTimeZoneContext = cache(
  async (): Promise<TimeZoneContext> => {
    const user = await requireCurrentUser();
    const cookieStore = await cookies();
    const cachedTimeZone = await readTimeZoneCookieValue(
      cookieStore.get(TIME_ZONE_COOKIE_NAME)?.value,
      user.id,
    );

    if (cachedTimeZone) {
      return Object.freeze({ id: user.id, time_zone: cachedTimeZone });
    }

    const profile = await getProfile(user.id);

    return Object.freeze({ id: profile.id, time_zone: profile.time_zone });
  },
);

export async function requireTimeZoneContext(): Promise<TimeZoneContext> {
  return getCurrentTimeZoneContext();
}
