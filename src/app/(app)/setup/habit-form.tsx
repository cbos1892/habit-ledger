"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button, Feedback, TextField } from "@/components/ui";
import {
  HABIT_COLORS,
  HABIT_ICON_MAX_LENGTH,
  type HabitFormValues,
} from "@/lib/habit-form";
import { ISO_WEEKDAYS, type IsoWeekday } from "@/lib/habit-schedule";

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

const weekdayLabels: Record<IsoWeekday, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export function HabitForm({ action, initialValues, mode }: HabitFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [weekdays, setWeekdays] = useState(initialValues.weekdays);
  const values = state.status === "error" ? state.values : initialValues;
  const errors = state.status === "error" ? state.errors : {};
  const isEveryDay = weekdays.length === ISO_WEEKDAYS.length;

  function toggleWeekday(weekday: IsoWeekday, selected: boolean) {
    setWeekdays((current) =>
      selected
        ? ISO_WEEKDAYS.filter(
            (candidate) => candidate === weekday || current.includes(candidate),
          )
        : current.filter((candidate) => candidate !== weekday),
    );
  }

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
          description="Choose one to three emojis. Combined emojis count as one."
          disabled={pending}
          error={errors.icon}
          id="habit-icon"
          label="Emojis"
          maxLength={HABIT_ICON_MAX_LENGTH}
          name="icon"
          placeholder="🌿✨"
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

      <fieldset
        aria-describedby={errors.weekdays ? "habit-weekdays-error" : undefined}
        className={styles.scheduleField}
        disabled={pending}
      >
        <legend>Schedule</legend>
        <p className={styles.scheduleDescription}>
          Choose every day or the weekdays when this habit should appear.
        </p>
        <label className={styles.everyDayOption}>
          <input
            checked={isEveryDay}
            onChange={(event) =>
              setWeekdays(event.target.checked ? [...ISO_WEEKDAYS] : [])
            }
            type="checkbox"
          />
          <span>Every day</span>
        </label>
        <div className={styles.weekdayOptions}>
          {ISO_WEEKDAYS.map((weekday) => (
            <label className={styles.weekdayOption} key={weekday}>
              <input
                aria-label={weekdayLabels[weekday]}
                checked={weekdays.includes(weekday)}
                name="weekdays"
                onChange={(event) =>
                  toggleWeekday(weekday, event.target.checked)
                }
                type="checkbox"
                value={weekday}
              />
              <span aria-hidden="true">
                {weekdayLabels[weekday].slice(0, 3)}
              </span>
              <span className={styles.srOnly}>{weekdayLabels[weekday]}</span>
            </label>
          ))}
        </div>
        {errors.weekdays ? (
          <p className={styles.error} id="habit-weekdays-error">
            {errors.weekdays}
          </p>
        ) : null}
      </fieldset>

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
