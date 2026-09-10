"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button, Feedback, TextField } from "@/components/ui";
import {
  ROUTINE_ICON_MAX_LENGTH,
  ROUTINE_NAME_MAX_LENGTH,
} from "@/lib/routine-form";

import type { RoutineFormState } from "./habit-actions";
import styles from "./time-zone.module.css";

const initialState: RoutineFormState = { status: "idle" };

export function RoutineEditForm({
  deleteAction,
  initialIcon,
  initialName,
  renameAction,
  routineId,
}: {
  deleteAction: (formData: FormData) => Promise<void>;
  initialIcon: string;
  initialName: string;
  renameAction: (
    state: RoutineFormState,
    formData: FormData,
  ) => Promise<RoutineFormState>;
  routineId: string;
}) {
  const [state, formAction, pending] = useActionState(
    renameAction,
    initialState,
  );
  const values =
    state.status === "error"
      ? state.values
      : { icon: initialIcon, name: initialName };
  return (
    <div className={styles.routineEditForm}>
      <form action={formAction} className={styles.form} noValidate>
        {state.status === "error" ? (
          <Feedback title="Routine not saved" tone="danger">
            <p>{state.message}</p>
          </Feedback>
        ) : null}
        <div className={styles.routineIdentityFields}>
          <TextField
            autoComplete="off"
            defaultValue={values.icon}
            disabled={pending}
            error={state.status === "error" ? state.errors.icon : undefined}
            id="routine-icon"
            label="Emoji"
            maxLength={ROUTINE_ICON_MAX_LENGTH}
            name="icon"
            placeholder="☀️"
            required
          />
          <TextField
            autoComplete="off"
            defaultValue={values.name}
            disabled={pending}
            error={state.status === "error" ? state.errors.name : undefined}
            id="routine-name"
            label="Routine name"
            maxLength={ROUTINE_NAME_MAX_LENGTH}
            name="name"
            required
          />
        </div>
        <div className={styles.actions}>
          <Button disabled={pending} type="submit">
            {pending ? "Saving…" : "Save changes"}
          </Button>
          <Link className={styles.cancelLink} href="/setup">
            Cancel
          </Link>
        </div>
      </form>
      <section
        aria-labelledby="routine-danger-title"
        className={styles.dangerZone}
      >
        <div>
          <h2 id="routine-danger-title">Delete routine</h2>
          <p>
            Its habits become standalone. Their schedules and history remain
            intact.
          </p>
        </div>
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                `Delete ${initialName}? Its habits will become standalone. Their schedules and history will be kept.`,
              )
            )
              event.preventDefault();
          }}
        >
          <input name="routineId" type="hidden" value={routineId} />
          <Button type="submit" variant="danger">
            Delete routine
          </Button>
        </form>
      </section>
    </div>
  );
}
