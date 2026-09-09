import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  appearanceStorageKey,
  applyAppearance,
  getStoredAppearance,
  resolveTheme,
  saveAppearance,
} from "./theme";

describe("theme preference", () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    const storage: Storage = {
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => Array.from(values.keys())[index] ?? null,
      get length() {
        return values.size;
      },
      removeItem: (key) => values.delete(key),
      setItem: (key, value) => values.set(key, value),
    };
    vi.stubGlobal("localStorage", storage);
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
  });

  afterEach(() => {
    values.clear();
    document.documentElement.removeAttribute("data-appearance");
    document.documentElement.removeAttribute("data-theme");
    vi.restoreAllMocks();
  });

  it("uses System for a missing or invalid saved preference", () => {
    expect(getStoredAppearance()).toBe("system");
    window.localStorage.setItem(appearanceStorageKey, "sepia");
    expect(getStoredAppearance()).toBe("system");
  });

  it("writes both the selected and resolved appearances", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    saveAppearance("system");

    expect(window.localStorage.getItem(appearanceStorageKey)).toBe("system");
    expect(document.documentElement.dataset).toMatchObject({
      appearance: "system",
      theme: "dark",
    });

    applyAppearance("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });
});
