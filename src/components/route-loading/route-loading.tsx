import styles from "./route-loading.module.css";

type RouteLoadingVariant = "setup" | "stats" | "today" | "week";

const routeCopy: Record<
  RouteLoadingVariant,
  Readonly<{ eyebrow: string; message: string; title: string }>
> = {
  setup: {
    eyebrow: "Make it yours",
    message: "Loading your habit setup…",
    title: "Setup",
  },
  stats: {
    eyebrow: "Progress, gently",
    message: "Gathering your progress…",
    title: "Stats",
  },
  today: {
    eyebrow: "Daily check-in",
    message: "Gathering today's habits…",
    title: "Today",
  },
  week: {
    eyebrow: "Seven-day view",
    message: "Gathering your week…",
    title: "Week",
  },
};

function SkeletonLine({ width }: { width: "long" | "medium" | "short" }) {
  return <span className={styles.line} data-width={width} />;
}

function TodaySkeleton() {
  return (
    <div className={styles.todayBody} aria-hidden="true">
      <div className={styles.progressCard}>
        <SkeletonLine width="medium" />
        <SkeletonLine width="long" />
        <span className={styles.progressTrack} />
      </div>
      <SkeletonLine width="short" />
      <div className={styles.cardList}>
        {Array.from({ length: 3 }, (_, index) => (
          <span className={styles.habitCard} key={index} />
        ))}
      </div>
    </div>
  );
}

function WeekSkeleton() {
  return (
    <div className={styles.weekBody} aria-hidden="true">
      <SkeletonLine width="medium" />
      <div className={styles.weekGrid}>
        {Array.from({ length: 32 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className={styles.statsCard} aria-hidden="true">
      <span className={styles.statusPill} />
      <SkeletonLine width="long" />
      <SkeletonLine width="medium" />
    </div>
  );
}

function SetupSkeleton() {
  return (
    <div className={styles.setupBody} aria-hidden="true">
      <div className={styles.setupHeading}>
        <div>
          <SkeletonLine width="short" />
          <SkeletonLine width="long" />
        </div>
        <span className={styles.setupButton} />
      </div>
      <div className={styles.cardList}>
        {Array.from({ length: 3 }, (_, index) => (
          <span className={styles.setupCard} key={index} />
        ))}
      </div>
    </div>
  );
}

export function RouteLoading({ variant }: { variant: RouteLoadingVariant }) {
  const copy = routeCopy[variant];

  return (
    <div
      aria-busy="true"
      className={styles.page}
      data-route-loading={variant}
      data-variant={variant}
    >
      <p className={styles.status} role="status">
        {copy.message}
      </p>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className={styles.title}>{copy.title}</h1>
        <span className={styles.headingLine} aria-hidden="true" />
      </header>

      {variant === "today" ? <TodaySkeleton /> : null}
      {variant === "week" ? <WeekSkeleton /> : null}
      {variant === "stats" ? <StatsSkeleton /> : null}
      {variant === "setup" ? <SetupSkeleton /> : null}
    </div>
  );
}
