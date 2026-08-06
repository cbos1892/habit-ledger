import { NextResponse } from "next/server";

import { getSafeAuthRedirect } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function errorRedirect(
  requestUrl: URL,
  error: "invalid_or_expired" | "oauth_failed",
) {
  const destination = new URL("/sign-in", requestUrl);
  destination.searchParams.set("error", error);
  return NextResponse.redirect(destination);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (requestUrl.searchParams.has("error")) {
    return errorRedirect(requestUrl, "oauth_failed");
  }

  if (!code) {
    return errorRedirect(requestUrl, "invalid_or_expired");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) return errorRedirect(requestUrl, "invalid_or_expired");

  return NextResponse.redirect(
    new URL(
      getSafeAuthRedirect(requestUrl.searchParams.get("next")),
      requestUrl,
    ),
  );
}
