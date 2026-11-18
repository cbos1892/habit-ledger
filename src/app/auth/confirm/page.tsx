import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Button, Card } from "@/components/ui";

import styles from "../../sign-in/sign-in.module.css";
import { confirmMagicLink } from "./actions";

export const metadata: Metadata = {
  title: "Confirm sign-in",
};

type ConfirmPageProps = {
  searchParams: Promise<{ token_hash?: string | string[] }>;
};

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const tokenHash = (await searchParams).token_hash;

  if (typeof tokenHash !== "string" || !tokenHash.trim()) {
    redirect("/sign-in?error=invalid_or_expired");
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="confirm-title">
        <div className={styles.intro}>
          <h1 className={styles.title} id="confirm-title">
            Confirm sign-in
          </h1>
          <p className={styles.description}>
            Continue to sign in to Habit Ledger on this device.
          </p>
        </div>
        <Card>
          <form action={confirmMagicLink} className={styles.form}>
            <input name="token_hash" type="hidden" value={tokenHash} />
            <Button className={styles.submit} type="submit">
              Continue to Habit Ledger
            </Button>
          </form>
        </Card>
      </section>
    </main>
  );
}
