"use client";
import { useSyncExternalStore } from "react";
import {
  appearanceChangeEvent,
  getStoredAppearance,
  saveAppearance,
  type Appearance,
} from "./theme";
import styles from "./theme-preference.module.css";
const options: readonly Appearance[] = ["light", "dark", "system"];

function subscribeToAppearance(onStoreChange: () => void) {
  window.addEventListener(appearanceChangeEvent, onStoreChange);
  return () => window.removeEventListener(appearanceChangeEvent, onStoreChange);
}

export function ThemePreference() {
  const appearance = useSyncExternalStore(
    subscribeToAppearance,
    getStoredAppearance,
    () => "system",
  );
  return (
    <fieldset className={styles.preference}>
      <legend className={styles.legend}>Appearance</legend>
      <div className={styles.options}>
        {options.map((option) => (
          <button
            aria-pressed={appearance === option}
            className={styles.option}
            key={option}
            onClick={() => {
              saveAppearance(option);
            }}
            type="button"
          >
            {option[0].toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
