import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";
import { isSupportedTimeZone } from "@/lib/time-zone";
import {
  canUseTimeZoneCookie,
  createTimeZoneCookieValue,
  readTimeZoneCookieValue,
  TIME_ZONE_COOKIE_NAME,
  timeZoneCookieOptions,
} from "@/lib/time-zone-cookie";

import { getSupabasePublicEnv } from "./env";

export async function refreshSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabasePublicEnv();
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;

  if (typeof userId === "string" && canUseTimeZoneCookie()) {
    const cachedTimeZone = await readTimeZoneCookieValue(
      request.cookies.get(TIME_ZONE_COOKIE_NAME)?.value,
      userId,
    );

    if (!cachedTimeZone) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("time_zone")
        .eq("id", userId)
        .single();

      if (profile && isSupportedTimeZone(profile.time_zone)) {
        const value = await createTimeZoneCookieValue(
          userId,
          profile.time_zone,
        );

        if (value) {
          request.cookies.set(TIME_ZONE_COOKIE_NAME, value);
          response.cookies.set(
            TIME_ZONE_COOKIE_NAME,
            value,
            timeZoneCookieOptions,
          );
        }
      }
    }
  }

  return response;
}
