"use server";

import { headers } from "next/headers";

import { getRequestOrigin } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type MagicLinkFormState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "error"; message: string; emailError?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestMagicLink(
  _previousState: MagicLinkFormState,
  formData: FormData,
): Promise<MagicLinkFormState> {
  const value = formData.get("email");
  const email = typeof value === "string" ? value.trim() : "";

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return {
      status: "error",
      message: "Check the email address and try again.",
      emailError: "Enter a valid email address.",
    };
  }

  try {
    const origin = getRequestOrigin(await headers());
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/today`,
      },
    });

    if (error) {
      return {
        status: "error",
        message:
          "We couldn't send a sign-in link right now. Wait a moment and try again.",
      };
    }
  } catch {
    return {
      status: "error",
      message:
        "We couldn't send a sign-in link right now. Wait a moment and try again.",
    };
  }

  return { status: "sent" };
}
