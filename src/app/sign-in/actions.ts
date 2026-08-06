"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getRequestOrigin } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type MagicLinkFormState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "error"; message: string; emailError?: string };

export type GoogleSignInState =
  { status: "idle" } | { status: "error"; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signInWithGoogle(
  _previousState: GoogleSignInState,
  _formData: FormData,
): Promise<GoogleSignInState> {
  void _previousState;
  void _formData;

  let authorizationUrl: string;

  try {
    const origin = getRequestOrigin(await headers());
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/today`,
      },
    });

    if (error || !data.url) {
      return {
        status: "error",
        message:
          "We couldn't start Google sign-in right now. Try again in a moment.",
      };
    }

    authorizationUrl = data.url;
  } catch {
    return {
      status: "error",
      message:
        "We couldn't start Google sign-in right now. Try again in a moment.",
    };
  }

  redirect(authorizationUrl);
}

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
