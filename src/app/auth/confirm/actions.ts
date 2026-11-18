"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function confirmMagicLink(formData: FormData) {
  const tokenHash = formData.get("token_hash");

  if (typeof tokenHash !== "string" || !tokenHash.trim()) {
    redirect("/sign-in?error=invalid_or_expired");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (error) redirect("/sign-in?error=invalid_or_expired");

  redirect("/today");
}
