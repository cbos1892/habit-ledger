"use client";

import { useActionState } from "react";

import { Button, Feedback, TextField } from "@/components/ui";

import { requestMagicLink, type MagicLinkFormState } from "./actions";
import styles from "./sign-in.module.css";

const initialState: MagicLinkFormState = { status: "idle" };

export function MagicLinkForm() {
  const [state, formAction, pending] = useActionState(
    requestMagicLink,
    initialState,
  );

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.status === "sent" ? (
        <Feedback title="Check your email" tone="success">
          <p>
            If the address can sign in, a secure link is on its way. You can
            close this page after opening the email.
          </p>
        </Feedback>
      ) : null}

      {state.status === "error" ? (
        <Feedback title="Link not sent" tone="danger">
          <p>{state.message}</p>
        </Feedback>
      ) : null}

      <TextField
        autoComplete="email"
        disabled={pending}
        error={state.status === "error" ? state.emailError : undefined}
        id="email"
        inputMode="email"
        label="Email address"
        name="email"
        placeholder="you@example.com"
        required
        type="email"
      />

      <Button className={styles.submit} disabled={pending} type="submit">
        {pending
          ? "Sending link…"
          : state.status === "sent"
            ? "Send again"
            : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
