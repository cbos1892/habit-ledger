import { useId, type CSSProperties } from "react";

import type { WeeklyCompletionPoint } from "../../../lib/stats";
import styles from "./trend-chart.module.css";

const TREND_WEEK_COUNT = 8;

const compactDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

type TrendBarStyle = CSSProperties & {
  "--trend-percentage": number;
};

export type TrendChartProps = Readonly<{
  weekly: readonly WeeklyCompletionPoint[];
}>;

function parseLocalDate(localDate: string) {
  return new Date(`${localDate}T00:00:00.000Z`);
}

function formatCompactDate(localDate: string) {
  return compactDateFormatter.format(parseLocalDate(localDate));
}

function formatFullDate(localDate: string) {
  return fullDateFormatter.format(parseLocalDate(localDate));
}

function formatDateRange(week: WeeklyCompletionPoint) {
  return `${formatFullDate(week.startDate)} through ${formatFullDate(week.endDate)}`;
}

function getWeekStatus(week: WeeklyCompletionPoint) {
  if (week.percentage === null) return "Unavailable";
  if (week.isPartial) return "In progress";
  return "Complete week";
}

function getAccessibleWeekLabel(week: WeeklyCompletionPoint) {
  const range = formatDateRange(week);

  if (week.percentage === null) {
    return `${range}: unavailable because there were no scheduled opportunities.`;
  }

  const progress = week.isPartial ? " Current week, still in progress." : "";

  return `${range}: ${week.percentage} percent, ${week.completedCount} of ${week.opportunityCount} scheduled opportunities completed.${progress}`;
}

function assertEightWeeks(weekly: readonly WeeklyCompletionPoint[]) {
  if (weekly.length !== TREND_WEEK_COUNT) {
    throw new Error(
      `TrendChart requires exactly ${TREND_WEEK_COUNT} weekly points; received ${weekly.length}.`,
    );
  }
}

/**
 * Server-rendered chart with no visualization dependency or client JavaScript.
 * The expandable table is the text equivalent for the CSS bar presentation.
 */
export function TrendChart({ weekly }: TrendChartProps) {
  const accessibleId = useId();
  const descriptionId = `${accessibleId}-description`;
  const titleId = `${accessibleId}-title`;

  assertEightWeeks(weekly);

  return (
    <section
      className={styles.card}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-trend-chart="eight-week"
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Eight-week view</p>
          <h2 className={styles.title} id={titleId}>
            Completion trend
          </h2>
        </div>
        <p className={styles.description} id={descriptionId}>
          Weekly completion across your schedule. The striped bar is the
          current, partial week.
        </p>
      </div>

      <ol
        className={styles.chart}
        aria-label="Weekly completion percentages"
        data-responsive-structure="eight-equal-columns"
      >
        {weekly.map((week) => {
          const unavailable = week.percentage === null;
          const percentage = week.percentage ?? 0;
          const style: TrendBarStyle = { "--trend-percentage": percentage };

          return (
            <li
              className={styles.week}
              aria-label={getAccessibleWeekLabel(week)}
              data-partial={week.isPartial ? "true" : undefined}
              data-state={unavailable ? "unavailable" : "available"}
              key={week.startDate}
            >
              <span className={styles.value} aria-hidden="true">
                {unavailable ? "—" : `${percentage}%`}
              </span>
              <span className={styles.track} aria-hidden="true">
                {unavailable ? (
                  <span className={styles.unavailableMark}>—</span>
                ) : (
                  <span className={styles.bar} style={style} />
                )}
              </span>
              <time
                className={styles.date}
                dateTime={week.startDate}
                aria-hidden="true"
              >
                {formatCompactDate(week.startDate)}
              </time>
              {week.isPartial ? (
                <span className={styles.currentMarker} aria-hidden="true">
                  Now
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className={styles.legend} aria-hidden="true">
        <span>
          <i data-legend="complete" /> Complete week
        </span>
        <span>
          <i data-legend="partial" /> Current partial week
        </span>
        <span>
          <i data-legend="unavailable" /> No opportunities
        </span>
      </div>

      <details className={styles.dataDetails}>
        <summary>View weekly values</summary>
        <div
          className={styles.tableScroller}
          role="region"
          aria-label="Scrollable weekly values table"
          tabIndex={0}
        >
          <table className={styles.dataTable}>
            <caption>
              Text equivalent of the eight-week completion trend
            </caption>
            <thead>
              <tr>
                <th scope="col">Week</th>
                <th scope="col">Status</th>
                <th scope="col">Completed</th>
                <th scope="col">Opportunities</th>
                <th scope="col">Rate</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((week) => (
                <tr key={week.startDate}>
                  <th scope="row">{formatDateRange(week)}</th>
                  <td>{getWeekStatus(week)}</td>
                  <td>{week.completedCount}</td>
                  <td>{week.opportunityCount}</td>
                  <td>
                    {week.percentage === null
                      ? "Unavailable"
                      : `${week.percentage}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
