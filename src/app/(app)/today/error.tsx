"use client";

import styles from "./today.module.css";

type TodayErrorProps = Readonly<{
  error: Error & { digest?: string };
  retry: () => void;
}>;

export default function TodayError({ retry }: TodayErrorProps) {
  return (
    <div className={styles.page}>
      <section className={styles.error} aria-labelledby="today-error-title">
        <span className={styles.errorIcon} aria-hidden="true">
          ↻
        </span>
        <p className={styles.errorEyebrow}>Temporary pause</p>
        <h1 className={styles.errorTitle} id="today-error-title">
          Today&apos;s habits could not be loaded.
        </h1>
        <p className={styles.errorCopy}>
          Your progress is safe. Check your connection and try loading this view
          again.
        </p>
        <button className={styles.retryButton} type="button" onClick={retry}>
          Try again
        </button>
      </section>
    </div>
  );
}
