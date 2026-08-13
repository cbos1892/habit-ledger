import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupportedTimeZone } from "@/lib/time-zone";
import {
  createTimeZoneCookieValue,
  TIME_ZONE_COOKIE_NAME,
  timeZoneCookieOptions,
} from "@/lib/time-zone-cookie";

type SyncResult = "preserved-manual" | "synchronized" | "unchanged";

async function responseWithCookie(
  userId: string,
  timeZone: string,
  result: SyncResult,
) {
  const response = NextResponse.json({ result, timeZone });
  const cookieValue = await createTimeZoneCookieValue(userId, timeZone);

  if (cookieValue) {
    response.cookies.set(
      TIME_ZONE_COOKIE_NAME,
      cookieValue,
      timeZoneCookieOptions,
    );
  }

  return response;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let timeZone = "";

  try {
    const body = (await request.json()) as { timeZone?: unknown };
    timeZone = typeof body.timeZone === "string" ? body.timeZone.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!isSupportedTimeZone(timeZone)) {
    return NextResponse.json(
      { error: "Unsupported IANA time zone" },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("time_zone, time_zone_confirmed_at, time_zone_source")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !isSupportedTimeZone(profile.time_zone)) {
    return NextResponse.json(
      { error: "Time zone unavailable" },
      { status: 503 },
    );
  }

  if (profile.time_zone_source === "manual" && profile.time_zone !== timeZone) {
    return responseWithCookie(user.id, profile.time_zone, "preserved-manual");
  }

  if (profile.time_zone === timeZone && profile.time_zone_confirmed_at) {
    return responseWithCookie(user.id, timeZone, "unchanged");
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      time_zone: timeZone,
      time_zone_confirmed_at: new Date().toISOString(),
      time_zone_source: "automatic",
    })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Time zone synchronization failed" },
      { status: 503 },
    );
  }

  return responseWithCookie(user.id, timeZone, "synchronized");
}
