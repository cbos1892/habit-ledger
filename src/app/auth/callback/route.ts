import { NextResponse } from "next/server";

import { getSafeAuthRedirect } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function errorRedirect(requestUrl: URL) {
  const destination = new URL("/sign-in", requestUrl);
  destination.searchParams.set("error", "invalid_or_expired");
  return NextResponse.redirect(destination);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code || requestUrl.searchParams.has("error")) {
    return errorRedirect(requestUrl);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) return errorRedirect(requestUrl);

  return NextResponse.redirect(
    new URL(
      getSafeAuthRedirect(requestUrl.searchParams.get("next")),
      requestUrl,
    ),
  );
}
