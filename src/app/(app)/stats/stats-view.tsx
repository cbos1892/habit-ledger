import Link from "next/link";
import type { ReactNode } from "react";

import type { StatisticsViewModel } from "../../../lib/stats";
import styles from "./stats.module.css";

export type StatsViewProps = Readonly<{
  insightsSection?: ReactNode;
  statistics: StatisticsViewModel;
  trendSection?: ReactNode;
}>;

const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});
const shortStartDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const shortEndDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

function parseLocalDate(localDate: string) {
  return new Date(`${localDate}T00:00:00.000Z`);
}

function formatDateWindow(startDate: string, endDate: string) {
  return `${shortStartDateFormatter.format(parseLocalDate(startDate))} – ${shortEndDateFormatter.format(parseLocalDate(endDate))}`;
}

function formatAccessibleDateWindow(startDate: string, endDate: string) {
  return `${fullDateFormatter.format(parseLocalDate(startDate))} through ${fullDateFormatter.format(parseLocalDate(endDate))}`;
}

function EmptyStats({ status }: Pick<StatisticsViewModel, "status">) {
  const noHabits = status === "no-habits";

  return (
    <section
      className={styles.empty}
      aria-labelledby="stats-empty-title"
      data-stats-state={status}
    >
      <span className={styles.emptyIcon} aria-hidden="true">
        {noHabits ? "🌱" : "◷"}
      </span>
      <p className={styles.emptyEyebrow}>
        {noHabits ? "A fresh page" : "A little more time"}
      </p>
      <h2 className={styles.emptyTitle} id="stats-empty-title">
        {noHabits
          ? "Your progress story starts with a habit."
          : "No scheduled opportunities yet."}
      </h2>
      <p className={styles.emptyCopy}>
        {noHabits
          ? "Add one small practice you want to tend. Once it has scheduled days, your two-week summary will grow here."
          : "Your habits are ready, but none have fallen inside this two-week window yet. Your first percentage will appear after a scheduled day arrives."}
      </p>
      <Link className={styles.setupLink} href="/setup">
        {noHabits ? "Create a habit" : "Review your schedule"}
      </Link>
    </section>
  );
}

function CompletionSummary({ statistics }: Pick<StatsViewProps, "statistics">) {
  const { overall } = statistics;

  if (statistics.status !== "ready" || overall.percentage === null) {
    return <EmptyStats status={statistics.status} />;
  }

  const visibleWindow = formatDateWindow(overall.startDate, overall.endDate);
  const accessibleWindow = formatAccessibleDateWindow(
    overall.startDate,
    overall.endDate,
  );

  return (
    <section
      className={styles.summaryCard}
      aria-labelledby="stats-summary-title"
      aria-describedby="stats-summary-description stats-summary-equivalent"
      data-stats-state="ready"
    >
      <div className={styles.summaryCopy}>
        <p className={styles.summaryEyebrow}>Your past 14 days</p>
        <h2 className={styles.summaryTitle} id="stats-summary-title">
          Overall completion
        </h2>
        <p className={styles.summaryDescription} id="stats-summary-description">
          A quiet look at how often you followed through on the habits you
          scheduled.
        </p>
      </div>

      <div className={styles.percentageBlock} aria-hidden="true">
        <span
          className={styles.percentageNumber}
          data-testid="stats-percentage"
        >
          {overall.percentage}
        </span>
        <span className={styles.percentageSymbol}>%</span>
      </div>

      <div className={styles.summaryDetails} aria-hidden="true">
        <p>
          <strong>{overall.completedCount}</strong> of{" "}
          {overall.opportunityCount} opportunities completed
        </p>
        <p>{visibleWindow}</p>
      </div>
      <p className={styles.srOnly} id="stats-summary-equivalent">
        {overall.completedCount} of {overall.opportunityCount} scheduled habit
        opportunities completed from {accessibleWindow}: {overall.percentage}{" "}
        percent.
      </p>
    </section>
  );
}

/** Stable composition boundary for the trend and insights follow-on tasks. */
export function StatsView({
  insightsSection,
  statistics,
  trendSection,
}: StatsViewProps) {
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Progress, gently</p>
        <h1 className={styles.title}>Stats</h1>
        <p className={styles.introduction}>
          Your patterns, reflected back without pressure.
        </p>
      </header>

      <CompletionSummary statistics={statistics} />

      {trendSection || insightsSection ? (
        <div className={styles.extensions} data-stats-sections="true">
          {trendSection ? (
            <div data-stats-section="trend">{trendSection}</div>
          ) : null}
          {insightsSection ? (
            <div data-stats-section="insights">{insightsSection}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SkeletonLine({ width }: { width: "long" | "medium" | "short" }) {
  return <span className={styles.skeletonLine} data-width={width} />;
}

export function StatsViewSkeleton() {
  return (
    <div className={styles.page} aria-busy="true" data-stats-state="loading">
      <p className={styles.srOnly} role="status">
        Gathering your progress…
      </p>
      <header className={styles.heading} aria-hidden="true">
        <p className={styles.eyebrow}>Progress, gently</p>
        <h1 className={styles.title}>Stats</h1>
        <span className={styles.skeletonIntroduction} />
      </header>

      <section className={styles.summarySkeleton} aria-hidden="true">
        <div className={styles.skeletonSummaryCopy}>
          <SkeletonLine width="short" />
          <SkeletonLine width="medium" />
          <SkeletonLine width="long" />
        </div>
        <span className={styles.skeletonPercentage} />
        <div className={styles.skeletonDetails}>
          <SkeletonLine width="medium" />
          <SkeletonLine width="short" />
        </div>
      </section>

      <div className={styles.skeletonExtensions} aria-hidden="true">
        <span />
        <span />
      </div>
    </div>
  );
}
