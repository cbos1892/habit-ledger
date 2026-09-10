"use client";

import { useActionState } from "react";

import { Button, Feedback, TextField } from "@/components/ui";
import { ROUTINE_NAME_MAX_LENGTH } from "@/lib/routine-form";

import type { RoutineFormState } from "./habit-actions";
import styles from "./time-zone.module.css";

const initialState: RoutineFormState = { status: "idle" };

type RoutineNameFormProps = {
  action: (
    state: RoutineFormState,
    formData: FormData,
  ) => Promise<RoutineFormState>;
  initialName?: string;
  mode: "create" | "rename";
  routineId?: string;
};

export function RoutineNameForm({
  action,
  initialName = "",
  mode,
  routineId,
}: RoutineNameFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const values =
    state.status === "error" ? state.values : { name: initialName };
  const errors = state.status === "error" ? state.errors : {};
  const fieldId = routineId ? `routine-name-${routineId}` : "new-routine-name";

  return (
    <form action={formAction} className={styles.routineNameForm} noValidate>
      <input name="icon" type="hidden" value="◌" />
      {state.status === "error" ? (
        <Feedback title="Routine not saved" tone="danger">
          <p>{state.message}</p>
        </Feedback>
      ) : null}
      <div className={styles.routineNameFields}>
        <TextField
          autoComplete="off"
          defaultValue={values.name}
          disabled={pending}
          error={errors.name}
          id={fieldId}
          label={mode === "create" ? "Routine name" : "Rename routine"}
          maxLength={ROUTINE_NAME_MAX_LENGTH}
          name="name"
          placeholder="Morning reset"
          required
        />
        <Button
          disabled={pending}
          size="small"
          type="submit"
          variant="secondary"
        >
          {pending ? "Saving…" : mode === "create" ? "Add routine" : "Rename"}
        </Button>
      </div>
    </form>
  );
}
