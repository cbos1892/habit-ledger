"use client";

import { useActionState, useSyncExternalStore } from "react";

import { Button, Feedback, TextField } from "@/components/ui";
import { getBrowserTimeZone } from "@/lib/time-zone";

import { updateTimeZone, type TimeZoneFormState } from "./actions";
import styles from "./time-zone.module.css";

const initialState: TimeZoneFormState = { status: "idle" };

type TimeZoneFormProps = {
  initialTimeZone: string;
  isOnboarding: boolean;
};

const commonTimeZones = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

const subscribeToBrowserTimeZone = () => () => undefined;
const getServerTimeZone = () => null;

export function TimeZoneForm({
  initialTimeZone,
  isOnboarding,
}: TimeZoneFormProps) {
  const [state, formAction, pending] = useActionState(
    updateTimeZone,
    initialState,
  );
  const browserTimeZone = useSyncExternalStore(
    subscribeToBrowserTimeZone,
    getBrowserTimeZone,
    getServerTimeZone,
  );
  const suggestedTimeZone =
    isOnboarding && browserTimeZone ? browserTimeZone : initialTimeZone;
  const options = Array.from(
    new Set([
      ...commonTimeZones,
      initialTimeZone,
      ...(browserTimeZone ? [browserTimeZone] : []),
    ]),
  );

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.status === "saved" ? (
        <Feedback title="Time zone saved" tone="success">
          <p>
            New date calculations will use {state.timeZone}. Existing calendar
            history stays on its original local dates.
          </p>
        </Feedback>
      ) : null}

      {state.status === "error" ? (
        <Feedback title="Time zone not saved" tone="danger">
          <p>{state.message}</p>
        </Feedback>
      ) : null}

      <input
        name="mode"
        type="hidden"
        value={isOnboarding ? "onboarding" : "settings"}
      />
      <TextField
        autoComplete="off"
        disabled={pending}
        description={
          browserTimeZone
            ? `This browser reports ${browserTimeZone}. Use an IANA identifier so calendar boundaries stay accurate.`
            : "Use an IANA identifier so calendar boundaries stay accurate."
        }
        error={state.status === "error" ? state.timeZoneError : undefined}
        id="time-zone"
        key={isOnboarding ? (browserTimeZone ?? "detecting") : "settings"}
        label="Time zone"
        list="time-zone-options"
        name="timeZone"
        placeholder="America/New_York"
        required
        spellCheck={false}
        defaultValue={suggestedTimeZone}
      />
      <datalist id="time-zone-options">
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      <div className={styles.actions}>
        <Button disabled={pending} type="submit">
          {pending
            ? "Saving…"
            : isOnboarding
              ? "Confirm and continue"
              : "Save time zone"}
        </Button>
      </div>
    </form>
  );
}
