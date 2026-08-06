import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Profile = Pick<
  Tables<"profiles">,
  "id" | "time_zone" | "time_zone_confirmed_at"
>;

export const getProfile = cache(async (userId: string): Promise<Profile> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, time_zone, time_zone_confirmed_at")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new Error("Unable to load the current user's profile.");
  }

  return Object.freeze(data);
});

export async function requireConfiguredProfile(): Promise<Profile> {
  const user = await requireCurrentUser();
  const profile = await getProfile(user.id);

  if (!profile.time_zone_confirmed_at) redirect("/setup");

  return profile;
}
