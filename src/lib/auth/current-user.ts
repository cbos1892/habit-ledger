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
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    return Object.freeze({ id: user.id });
  } catch {
    // Authentication failures, including an unavailable Auth service, must
    // fail closed rather than allowing a private route to render.
    return null;
  }
});

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) redirect("/sign-in");

  return user;
}
