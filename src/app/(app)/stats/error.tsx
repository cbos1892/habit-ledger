"use client";

import styles from "./stats.module.css";

type StatsErrorProps = Readonly<{
  error: Error & { digest?: string };
  retry: () => void;
}>;

export default function StatsError({ retry }: StatsErrorProps) {
  return (
    <div className={styles.page}>
      <section className={styles.error} aria-labelledby="stats-error-title">
        <span className={styles.errorIcon} aria-hidden="true">
          ↻
        </span>
        <p className={styles.errorEyebrow}>Temporary pause</p>
        <h1 className={styles.errorTitle} id="stats-error-title">
          Your stats could not be loaded.
        </h1>
        <p className={styles.errorCopy}>
          Your habit history is safe. Check your connection and try gathering
          this view again.
        </p>
        <button className={styles.retryButton} type="button" onClick={retry}>
          Try again
        </button>
      </section>
    </div>
  );
}
