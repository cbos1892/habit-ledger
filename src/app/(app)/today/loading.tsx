import styles from "./today.module.css";

export default function TodayLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Daily check-in</p>
          <h1 className={styles.title}>Today</h1>
          <p className={styles.loadingCopy}>Gathering your habits…</p>
        </div>
      </header>
      <section
        className={styles.loadingPanel}
        aria-label="Loading today's habits"
      >
        <span className={styles.loadingLine} />
        <span className={styles.loadingLine} />
        <span className={styles.loadingLine} />
      </section>
    </div>
  );
}
