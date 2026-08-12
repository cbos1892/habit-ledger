import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CurrentUser = Readonly<{
  id: string;
}>;

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getClaims();
    const subject = data?.claims.sub;

    if (error || typeof subject !== "string" || subject.length === 0)
      return null;

    return Object.freeze({ id: subject });
  } catch {
    // JWT parsing, verification, refresh, and JWKS failures must all fail
    // closed rather than allowing a private route to render.
    return null;
  }
});

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) redirect("/sign-in");

  return user;
}
