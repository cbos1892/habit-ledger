export const appearanceStorageKey = "habit-ledger:appearance";
export const appearanceChangeEvent = "habit-ledger:appearance-change";
export type Appearance = "light" | "dark" | "system";
export type ResolvedTheme = Exclude<Appearance, "system">;

export function isAppearance(value: string | undefined): value is Appearance {
  return value === "light" || value === "dark" || value === "system";
}

export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveTheme(appearance: Appearance): ResolvedTheme {
  return appearance === "system" ? getSystemTheme() : appearance;
}

export function getStoredAppearance(): Appearance {
  try {
    const appearance = window.localStorage.getItem(appearanceStorageKey);
    const candidate = appearance ?? undefined;
    return isAppearance(candidate) ? candidate : "system";
  } catch {
    return "system";
  }
}

export function applyAppearance(appearance: Appearance) {
  const root = document.documentElement;
  root.dataset.appearance = appearance;
  root.dataset.theme = resolveTheme(appearance);
}

export function saveAppearance(appearance: Appearance) {
  try {
    window.localStorage.setItem(appearanceStorageKey, appearance);
  } catch {}
  applyAppearance(appearance);
  window.dispatchEvent(new Event(appearanceChangeEvent));
}
