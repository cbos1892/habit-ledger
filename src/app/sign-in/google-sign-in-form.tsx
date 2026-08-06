"use client";

import { useActionState } from "react";

import { Button, Feedback } from "@/components/ui";

import { signInWithGoogle, type GoogleSignInState } from "./actions";
import styles from "./sign-in.module.css";

const initialState: GoogleSignInState = { status: "idle" };

export function GoogleSignInForm() {
  const [state, formAction, pending] = useActionState(
    signInWithGoogle,
    initialState,
  );

  return (
    <form action={formAction} className={styles.googleForm}>
      {state.status === "error" ? (
        <Feedback title="Google sign-in unavailable" tone="danger">
          <p>{state.message}</p>
        </Feedback>
      ) : null}

      <Button
        className={styles.googleButton}
        disabled={pending}
        type="submit"
        variant="secondary"
      >
        <span className={styles.googleMark} aria-hidden="true">
          G
        </span>
        {pending ? "Opening Google…" : "Continue with Google"}
      </Button>
    </form>
  );
}
