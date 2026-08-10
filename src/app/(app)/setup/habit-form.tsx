"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button, Feedback, TextField } from "@/components/ui";
import { HABIT_COLORS, type HabitFormValues } from "@/lib/habit-form";

import type { HabitFormState } from "./habit-actions";
import styles from "./habit-form.module.css";

const initialState: HabitFormState = { status: "idle" };

type HabitFormProps = {
  action: (
    state: HabitFormState,
    formData: FormData,
  ) => Promise<HabitFormState>;
  initialValues: HabitFormValues;
  mode: "create" | "edit";
};

const colorLabels: Record<(typeof HABIT_COLORS)[number], string> = {
  fern: "Fern",
  ocean: "Ocean",
  sun: "Sun",
  plum: "Plum",
  rose: "Rose",
};

export function HabitForm({ action, initialValues, mode }: HabitFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = state.status === "error" ? state.values : initialValues;
  const errors = state.status === "error" ? state.errors : {};

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.status === "error" ? (
        <Feedback title="Habit not saved" tone="danger">
          <p>{state.message}</p>
        </Feedback>
      ) : null}

      <div className={styles.identityFields}>
        <TextField
          autoComplete="off"
          defaultValue={values.icon}
          disabled={pending}
          error={errors.icon}
          id="habit-icon"
          label="Icon or emoji"
          maxLength={16}
          name="icon"
          placeholder="🌿"
          required
        />
        <TextField
          autoComplete="off"
          defaultValue={values.name}
          description="Use a short name that feels natural in Today and Week."
          disabled={pending}
          error={errors.name}
          id="habit-name"
          label="Habit name"
          maxLength={100}
          name="name"
          placeholder="Morning walk"
          required
        />
      </div>

      <fieldset
        aria-describedby={errors.color ? "habit-color-error" : undefined}
        className={styles.colorField}
        disabled={pending}
      >
        <legend>Color</legend>
        <div className={styles.colorOptions}>
          {HABIT_COLORS.map((color) => (
            <label className={styles.colorOption} key={color}>
              <input
                defaultChecked={values.color === color}
                name="color"
                required
                type="radio"
                value={color}
              />
              <span
                aria-hidden="true"
                className={styles.colorSwatch}
                data-color={color}
              />
              <span>{colorLabels[color]}</span>
            </label>
          ))}
        </div>
        {errors.color ? (
          <p className={styles.error} id="habit-color-error">
            {errors.color}
          </p>
        ) : null}
      </fieldset>

      <TextField
        defaultValue={values.startDate}
        description="The habit becomes available on this local calendar date."
        disabled={pending}
        error={errors.startDate}
        id="habit-start-date"
        label="Start date"
        name="startDate"
        required
        type="date"
      />

      <div className={styles.actions}>
        <Button disabled={pending} type="submit">
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create habit"
              : "Save changes"}
        </Button>
        <Link className={styles.cancelLink} href="/setup">
          Cancel
        </Link>
      </div>
    </form>
  );
}
