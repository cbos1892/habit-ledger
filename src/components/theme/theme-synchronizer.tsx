"use client";
import { useEffect } from "react";
import {
  applyAppearance,
  appearanceStorageKey,
  getStoredAppearance,
  isAppearance,
} from "./theme";

export function ThemeSynchronizer() {
  useEffect(() => {
    const root = document.documentElement;
    const appearance = isAppearance(root.dataset.appearance)
      ? root.dataset.appearance
      : getStoredAppearance();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    applyAppearance(appearance);
    const syncSystemAppearance = () => {
      if (root.dataset.appearance === "system") applyAppearance("system");
    };
    const syncStoredAppearance = (event: StorageEvent) => {
      if (event.key === appearanceStorageKey)
        applyAppearance(getStoredAppearance());
    };
    media.addEventListener("change", syncSystemAppearance);
    window.addEventListener("storage", syncStoredAppearance);
    return () => {
      media.removeEventListener("change", syncSystemAppearance);
      window.removeEventListener("storage", syncStoredAppearance);
    };
  }, []);
  return null;
}
