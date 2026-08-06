export type SupabasePublicEnv = Readonly<{
  url: string;
  publishableKey: string;
}>;

type SupabasePublicEnvInput = {
  url?: string;
  publishableKey?: string;
};

function requireValue(value: string | undefined, variableName: string) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(
      `Missing required environment variable ${variableName}. ` +
        "Copy .env.example to .env.local for local development, or configure it in Vercel.",
    );
  }

  return normalizedValue;
}

export function parseSupabasePublicEnv(
  input: SupabasePublicEnvInput,
): SupabasePublicEnv {
  const url = requireValue(input.url, "NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = requireValue(
    input.publishableKey,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP or HTTPS URL.",
    );
  }

  if (publishableKey.startsWith("sb_secret_")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY cannot contain a Supabase secret key.",
    );
  }

  return Object.freeze({ url, publishableKey });
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  // These must remain direct property accesses so Next.js can inline them in
  // browser bundles. Dynamic process.env lookups are not replaced at build time.
  return parseSupabasePublicEnv({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
