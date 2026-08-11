import type {
  WeeklyHabitCell,
  WeeklyHabitRow,
  WeeklyViewModel,
} from "@/lib/week";

import styles from "./week.module.css";

const shortDayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "short",
});
const dayNumberFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  timeZone: "UTC",
});
const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  weekday: "long",
  year: "numeric",
});
const rangeDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function parseLocalDate(localDate: string) {
  return new Date(`${localDate}T00:00:00.000Z`);
}

function getTiming(
  localDate: string,
  currentLocalDate: string,
): "future" | "past" | "today" {
  if (localDate === currentLocalDate) return "today";
  return localDate > currentLocalDate ? "future" : "past";
}

function getStateLabel(cell: WeeklyHabitCell) {
  if (cell.state === "completed") return "completed";
  if (cell.state === "not-scheduled") return "not scheduled";
  return "incomplete";
}

function CellMark({ cell }: { cell: WeeklyHabitCell }) {
  if (cell.state === "completed") return <>✓</>;
  if (cell.state === "not-scheduled") return <>—</>;
  return null;
}

function HabitRow({
  currentLocalDate,
  row,
}: {
  currentLocalDate: string;
  row: WeeklyHabitRow;
}) {
  return (
    <tr>
      <th className={styles.habitHeader} data-color={row.color} scope="row">
        <span className={styles.habitIdentity}>
          <span className={styles.habitIcon} aria-hidden="true">
            {row.icon}
          </span>
          <span className={styles.srOnly}>{row.name}</span>
        </span>
      </th>
      {row.cells.map((cell) => {
        const date = parseLocalDate(cell.localDate);
        const timing = getTiming(cell.localDate, currentLocalDate);
        const timingLabel =
          timing === "today"
            ? ", today"
            : timing === "future"
              ? ", future"
              : "";

        return (
          <td
            className={styles.cell}
            data-state={cell.state}
            data-timing={timing}
            key={cell.localDate}
          >
            <span className={styles.cellMark} aria-hidden="true">
              <CellMark cell={cell} />
            </span>
            <span className={styles.srOnly}>
              {row.name}, {fullDateFormatter.format(date)}
              {timingLabel}, {getStateLabel(cell)}
            </span>
          </td>
        );
      })}
    </tr>
  );
}

export function WeekView({ week }: { week: WeeklyViewModel }) {
  const rangeLabel = `${rangeDateFormatter.format(parseLocalDate(week.startDate))}–${rangeDateFormatter.format(parseLocalDate(week.endDate))}`;

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Seven-day view</p>
          <h1 className={styles.title} id="week-title">
            Week
          </h1>
          <p className={styles.dateRange}>{rangeLabel}</p>
        </div>
        {week.status === "ready" ? (
          <p className={styles.summary}>
            {week.rows.length} {week.rows.length === 1 ? "habit" : "habits"}
          </p>
        ) : null}
      </header>

      {week.status === "empty" ? (
        <section className={styles.empty} aria-labelledby="empty-week-title">
          <span className={styles.emptyIcon} aria-hidden="true">
            🗓️
          </span>
          <p className={styles.emptyEyebrow}>A clear week</p>
          <h2 className={styles.emptyTitle} id="empty-week-title">
            No habits are scheduled this week.
          </h2>
          <p className={styles.emptyCopy}>
            Your active habits will appear here when their next scheduled week
            arrives.
          </p>
        </section>
      ) : (
        <section className={styles.gridSection}>
          <div className={styles.gridHeading}>
            <div>
              <h2 id="week-grid-title">Weekly rhythm</h2>
              <p>Scroll sideways to see every day.</p>
            </div>
            <div className={styles.legend} aria-label="Grid legend">
              <span>
                <i data-state="completed" />
                Complete
              </span>
              <span>
                <i data-state="incomplete" />
                Incomplete
              </span>
              <span>
                <i data-state="not-scheduled" />
                Not scheduled
              </span>
            </div>
          </div>
          <div
            className={styles.scrollRegion}
            role="region"
            aria-label="Scrollable weekly habit grid"
            tabIndex={0}
          >
            <table className={styles.grid}>
              <caption className={styles.srOnly}>
                Habit completion status for {rangeLabel}
              </caption>
              <thead>
                <tr>
                  <th className={styles.cornerHeader} scope="col">
                    Habit
                  </th>
                  {week.localDates.map((localDate) => {
                    const date = parseLocalDate(localDate);
                    const timing = getTiming(localDate, week.currentLocalDate);

                    return (
                      <th
                        className={styles.dayHeader}
                        data-timing={timing}
                        key={localDate}
                        scope="col"
                      >
                        <span aria-hidden="true">
                          {shortDayFormatter.format(date)}
                        </span>
                        <strong aria-hidden="true">
                          {dayNumberFormatter.format(date)}
                        </strong>
                        <span className={styles.srOnly}>
                          {fullDateFormatter.format(date)}
                          {timing === "today" ? ", today" : ""}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {week.rows.map((row) => (
                  <HabitRow
                    currentLocalDate={week.currentLocalDate}
                    key={row.id}
                    row={row}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
