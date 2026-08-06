import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card, Feedback } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/current-user";

import { MagicLinkForm } from "./magic-link-form";
import { GoogleSignInForm } from "./google-sign-in-form";
import styles from "./sign-in.module.css";

export const metadata: Metadata = {
  title: "Sign in",
};

type SignInPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const user = await getCurrentUser();

  if (user) redirect("/today");

  const error = (await searchParams).error;
  const hasCallbackError =
    error === "invalid_or_expired" ||
    (Array.isArray(error) && error.includes("invalid_or_expired"));
  const hasOAuthError =
    error === "oauth_failed" ||
    (Array.isArray(error) && error.includes("oauth_failed"));

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="sign-in-title">
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            H
          </span>
          <span>Habit Ledger</span>
        </div>

        <div className={styles.intro}>
          <p className={styles.eyebrow}>Your private habit space</p>
          <h1 className={styles.title} id="sign-in-title">
            Welcome back.
          </h1>
          <p className={styles.description}>
            Continue with Google, or request a secure one-time sign-in link by
            email. No password to remember.
          </p>
        </div>

        <Card className={styles.card}>
          {hasCallbackError ? (
            <Feedback title="That link has expired" tone="warning">
              <p>
                Sign-in links are single-use and time-limited. Request a fresh
                link below to continue.
              </p>
            </Feedback>
          ) : null}
          {hasOAuthError ? (
            <Feedback title="Google sign-in was not completed" tone="warning">
              <p>
                Google could not sign you in, or the request was cancelled. Try
                again or use an email link instead.
              </p>
            </Feedback>
          ) : null}
          <GoogleSignInForm />
          <div className={styles.divider} aria-hidden="true">
            <span>or continue with email</span>
          </div>
          <MagicLinkForm />
        </Card>

        <p className={styles.privacy}>
          Your habits stay private to your account.
        </p>
      </section>
    </main>
  );
}
