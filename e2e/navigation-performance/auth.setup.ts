import { createBrowserClient } from "@supabase/ssr";
import type { FullConfig } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const storageStatePath = resolve(".auth/navigation-performance.json");

type CapturedCookie = {
  name: string;
  value: string;
  options: {
    domain?: string;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: boolean | "lax" | "strict" | "none";
    secure?: boolean;
  };
};

function requireEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is required unless NAV_PERF_STORAGE_STATE_B64 supplies an authenticated Playwright storage state.`,
    );
  }

  return value;
}

function normalizeSameSite(value: CapturedCookie["options"]["sameSite"]) {
  if (value === "strict") return "Strict" as const;
  if (value === "none") return "None" as const;
  return "Lax" as const;
}

export default async function authenticatedStorageState(config: FullConfig) {
  await mkdir(dirname(storageStatePath), { recursive: true });

  const encodedStorageState = process.env.NAV_PERF_STORAGE_STATE_B64?.trim();

  if (encodedStorageState) {
    const decoded = Buffer.from(encodedStorageState, "base64").toString("utf8");
    JSON.parse(decoded);
    await writeFile(storageStatePath, decoded, { mode: 0o600 });
    return;
  }

  const baseURL = config.projects[0]?.use.baseURL;
  if (typeof baseURL !== "string") {
    throw new Error("The navigation performance project requires a baseURL.");
  }

  const appOrigin = new URL(baseURL);
  const capturedCookies = new Map<string, CapturedCookie>();
  const supabase = createBrowserClient(
    requireEnvironmentVariable("NAV_PERF_SUPABASE_URL"),
    requireEnvironmentVariable("NAV_PERF_SUPABASE_PUBLISHABLE_KEY"),
    {
      isSingleton: false,
      cookies: {
        getAll() {
          return [...capturedCookies.values()].map(({ name, value }) => ({
            name,
            value,
          }));
        },
        setAll(cookies) {
          for (const cookie of cookies) {
            if (!cookie.value || cookie.options.maxAge === 0) {
              capturedCookies.delete(cookie.name);
            } else {
              capturedCookies.set(cookie.name, cookie);
            }
          }
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({
    email: requireEnvironmentVariable("NAV_PERF_EMAIL"),
    password: requireEnvironmentVariable("NAV_PERF_PASSWORD"),
  });

  if (error) {
    throw new Error(
      `The navigation performance account could not sign in: ${error.message}`,
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const storageState = {
    cookies: [...capturedCookies.values()].map(({ name, value, options }) => ({
      name,
      value,
      domain: options.domain ?? appOrigin.hostname,
      path: options.path ?? "/",
      expires: typeof options.maxAge === "number" ? now + options.maxAge : -1,
      httpOnly: options.httpOnly ?? false,
      secure: options.secure ?? appOrigin.protocol === "https:",
      sameSite: normalizeSameSite(options.sameSite),
    })),
    origins: [],
  };

  await writeFile(storageStatePath, JSON.stringify(storageState), {
    mode: 0o600,
  });
}
