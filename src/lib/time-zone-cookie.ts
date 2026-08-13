import "server-only";

import { isSupportedTimeZone } from "@/lib/time-zone";

export const TIME_ZONE_COOKIE_NAME = "habit-ledger-time-zone";
export const TIME_ZONE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type TimeZoneCookiePayload = Readonly<{
  expiresAt: number;
  timeZone: string;
  userId: string;
  version: 1;
}>;

function getSigningSecret(): string | null {
  const secret = process.env.TIME_ZONE_COOKIE_SECRET;

  return secret && secret.length >= 32 ? secret : null;
}

function encode(value: string | Uint8Array): string {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;

  return Buffer.from(bytes).toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );

  return encode(new Uint8Array(signature));
}

async function verify(
  value: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { hash: "SHA-256", name: "HMAC" },
      false,
      ["verify"],
    );

    return crypto.subtle.verify(
      "HMAC",
      key,
      Buffer.from(signature, "base64url"),
      new TextEncoder().encode(value),
    );
  } catch {
    return false;
  }
}

export function canUseTimeZoneCookie(): boolean {
  return getSigningSecret() !== null;
}

export async function createTimeZoneCookieValue(
  userId: string,
  timeZone: string,
  now = Date.now(),
): Promise<string | null> {
  const secret = getSigningSecret();

  if (!secret || !userId || !isSupportedTimeZone(timeZone)) return null;

  const payload: TimeZoneCookiePayload = {
    expiresAt: now + TIME_ZONE_COOKIE_MAX_AGE * 1000,
    timeZone,
    userId,
    version: 1,
  };
  const encodedPayload = encode(JSON.stringify(payload));

  return `${encodedPayload}.${await sign(encodedPayload, secret)}`;
}

export async function readTimeZoneCookieValue(
  value: string | undefined,
  expectedUserId: string,
  now = Date.now(),
): Promise<string | null> {
  const secret = getSigningSecret();

  if (!secret || !value || !expectedUserId) return null;

  const [encodedPayload, providedSignature, ...extra] = value.split(".");

  if (!encodedPayload || !providedSignature || extra.length > 0) return null;

  if (!(await verify(encodedPayload, providedSignature, secret))) return null;

  try {
    const payload = JSON.parse(
      decode(encodedPayload),
    ) as Partial<TimeZoneCookiePayload>;

    if (
      payload.version !== 1 ||
      payload.userId !== expectedUserId ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= now ||
      typeof payload.timeZone !== "string" ||
      !isSupportedTimeZone(payload.timeZone)
    ) {
      return null;
    }

    return payload.timeZone;
  } catch {
    return null;
  }
}

export const timeZoneCookieOptions = Object.freeze({
  httpOnly: true,
  maxAge: TIME_ZONE_COOKIE_MAX_AGE,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
});
