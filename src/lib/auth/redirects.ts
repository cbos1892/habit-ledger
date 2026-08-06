const DEFAULT_AUTH_REDIRECT = "/today";

const AUTH_REDIRECT_ALLOWLIST = new Set([
  "/setup",
  "/stats",
  "/today",
  "/week",
]);

export function getSafeAuthRedirect(value: string | null | undefined) {
  if (!value) return DEFAULT_AUTH_REDIRECT;

  try {
    const parsed = new URL(value, "https://habit-ledger.invalid");

    if (parsed.origin !== "https://habit-ledger.invalid") {
      return DEFAULT_AUTH_REDIRECT;
    }

    if (!AUTH_REDIRECT_ALLOWLIST.has(parsed.pathname)) {
      return DEFAULT_AUTH_REDIRECT;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}

function parseOrigin(value: string | null) {
  if (!value) return null;

  try {
    const parsed = new URL(value);

    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

export function getRequestOrigin(requestHeaders: Headers) {
  const directOrigin = parseOrigin(requestHeaders.get("origin"));
  if (directOrigin) return directOrigin;

  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0];
  const host = forwardedHost?.trim() || requestHeaders.get("host")?.trim();

  if (!host || /[\\/@]/.test(host)) {
    throw new Error("Unable to determine a safe application origin.");
  }

  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : host.startsWith("localhost:") || host.startsWith("127.0.0.1:")
        ? "http"
        : "https";
  const derivedOrigin = parseOrigin(`${protocol}://${host}`);

  if (!derivedOrigin) {
    throw new Error("Unable to determine a safe application origin.");
  }

  return derivedOrigin;
}
