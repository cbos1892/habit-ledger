"use client";

import { useActionState } from "react";

import { Button, Feedback } from "@/components/ui";
import type { WeekStartsOn } from "@/lib/time-zone";

import { updateWeekStart, type WeekStartFormState } from "./actions";
import styles from "../../setup/time-zone.module.css";

const initialState: WeekStartFormState = { status: "idle" };

const options = [
  {
    description: "Monday, Aug 10 – Sunday, Aug 16",
    label: "Monday–Sunday",
    value: 1,
  },
  {
    description: "Sunday, Aug 9 – Saturday, Aug 15",
    label: "Sunday–Saturday",
    value: 0,
  },
] as const;

export function WeekStartForm({
  initialWeekStartsOn,
}: {
  initialWeekStartsOn: WeekStartsOn;
}) {
  const [state, formAction, pending] = useActionState(
    updateWeekStart,
    initialState,
  );

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.status === "saved" ? (
        <Feedback title="Week layout saved" tone="success">
          <p>The Week grid and its navigation now use your selected layout.</p>
        </Feedback>
      ) : null}

      {state.status === "error" ? (
        <Feedback title="Week layout not saved" tone="danger">
          <p>{state.message}</p>
        </Feedback>
      ) : null}

      <fieldset
        aria-describedby={
          state.status === "error" && state.weekStartError
            ? "week-start-error"
            : "week-start-description"
        }
        aria-invalid={
          state.status === "error" && state.weekStartError ? true : undefined
        }
        className={styles.choiceGroup}
        disabled={pending}
      >
        <legend>First day of the week</legend>
        <p className={styles.choiceDescription} id="week-start-description">
          Choose how seven-day ranges are grouped throughout the Week view.
        </p>
        <div className={styles.choices}>
          {options.map((option) => (
            <label className={styles.choice} key={option.value}>
              <input
                defaultChecked={initialWeekStartsOn === option.value}
                name="weekStartsOn"
                type="radio"
                value={option.value}
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          ))}
        </div>
        {state.status === "error" && state.weekStartError ? (
          <p className={styles.choiceError} id="week-start-error">
            {state.weekStartError}
          </p>
        ) : null}
      </fieldset>

      <div className={styles.actions}>
        <Button disabled={pending} type="submit">
          {pending ? "Saving…" : "Save week layout"}
        </Button>
      </div>
    </form>
  );
}
