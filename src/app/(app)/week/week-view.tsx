"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useState, useTransition } from "react";

import type {
  WeeklyHabitCell,
  WeeklyHabitRow,
  WeeklyViewModel,
} from "@/lib/week";
import { addLocalDateDays, getLocalWeekStartDate } from "@/lib/time-zone";

import { setHabitCompletion } from "./completion-actions";
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

type OptimisticCellUpdate = Readonly<{
  completed: boolean;
  habitId: string;
  localDate: string;
}>;

function updateOptimisticCell(
  week: WeeklyViewModel,
  update: OptimisticCellUpdate,
): WeeklyViewModel {
  if (week.status === "empty") return week;

  return {
    ...week,
    rows: week.rows.map((row) =>
      row.id !== update.habitId
        ? row
        : {
            ...row,
            cells: row.cells.map((cell) =>
              cell.localDate !== update.localDate
                ? cell
                : {
                    ...cell,
                    completionId: update.completed ? cell.completionId : null,
                    state: update.completed ? "completed" : "incomplete",
                  },
            ),
          },
    ),
  };
}

function getCellKey(habitId: string, localDate: string) {
  return `${habitId}:${localDate}`;
}

function getRowProgress(row: WeeklyHabitRow) {
  const scheduledCells = row.cells.filter(
    ({ state }) => state !== "not-scheduled",
  );

  return {
    completed: scheduledCells.filter(({ state }) => state === "completed")
      .length,
    total: scheduledCells.length,
  };
}

function HabitRow({
  currentLocalDate,
  mutateCompletion,
  pendingCells,
  row,
}: {
  currentLocalDate: string;
  mutateCompletion: (
    habitId: string,
    localDate: string,
    completed: boolean,
  ) => void;
  pendingCells: ReadonlySet<string>;
  row: WeeklyHabitRow;
}) {
  const progress = getRowProgress(row);

  return (
    <tr>
      <th className={styles.habitHeader} data-color={row.color} scope="row">
        <span className={styles.habitIdentity}>
          <span className={styles.habitIcon} aria-hidden="true">
            {row.icon}
          </span>
          <span className={styles.srOnly}>{row.name}</span>
          <span
            className={styles.rowProgress}
            aria-label={`${progress.completed} of ${progress.total} scheduled days complete`}
          >
            {progress.completed}/{progress.total}
          </span>
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
        const editable = timing !== "future" && cell.state !== "not-scheduled";
        const completed = cell.state === "completed";
        const pending = pendingCells.has(getCellKey(row.id, cell.localDate));
        const label = `${row.name}, ${fullDateFormatter.format(date)}${timingLabel}, ${getStateLabel(cell)}`;

        return (
          <td
            className={styles.cell}
            data-state={cell.state}
            data-timing={timing}
            key={cell.localDate}
          >
            {editable ? (
              <button
                className={styles.cellButton}
                type="button"
                aria-label={label}
                aria-pressed={completed}
                disabled={pending}
                onClick={() =>
                  mutateCompletion(row.id, cell.localDate, !completed)
                }
              >
                <span className={styles.cellMark} aria-hidden="true">
                  <CellMark cell={cell} />
                </span>
                <span className={styles.srOnly}>{label}</span>
              </button>
            ) : (
              <>
                <span className={styles.cellMark} aria-hidden="true">
                  <CellMark cell={cell} />
                </span>
                <span className={styles.srOnly}>{label}</span>
              </>
            )}
          </td>
        );
      })}
    </tr>
  );
}

export function WeekView({ week }: { week: WeeklyViewModel }) {
  const [optimisticWeek, setOptimisticCell] = useOptimistic(
    week,
    updateOptimisticCell,
  );
  const [, startTransition] = useTransition();
  const [pendingCells, setPendingCells] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const rangeLabel = `${rangeDateFormatter.format(parseLocalDate(optimisticWeek.startDate))}–${rangeDateFormatter.format(parseLocalDate(optimisticWeek.endDate))}`;
  const currentWeekStart = getLocalWeekStartDate(
    optimisticWeek.currentLocalDate,
    optimisticWeek.weekStartsOn,
  );
  const previousWeekStart = addLocalDateDays(optimisticWeek.startDate, -7);
  const nextWeekStart = addLocalDateDays(optimisticWeek.startDate, 7);
  const isCurrentWeek = optimisticWeek.startDate === currentWeekStart;

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => setNotice(null), 8000);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  function mutateCompletion(
    habitId: string,
    localDate: string,
    completed: boolean,
  ) {
    const cellKey = getCellKey(habitId, localDate);

    if (pendingCells.has(cellKey)) return;

    setNotice(null);
    setPendingCells((current) => new Set(current).add(cellKey));

    startTransition(async () => {
      setOptimisticCell({ completed, habitId, localDate });

      let result;

      try {
        result = await setHabitCompletion(habitId, completed, localDate);
      } catch {
        result = {
          status: "error" as const,
          message:
            "We couldn't update this habit. Your previous check-in is restored.",
        };
      }

      if (result.status === "error") setNotice(result.message);

      setPendingCells((current) => {
        const next = new Set(current);
        next.delete(cellKey);
        return next;
      });
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Seven-day view</p>
          <h1 className={styles.title} id="week-title">
            Week
          </h1>
          <p className={styles.dateRange}>{rangeLabel}</p>
          <nav className={styles.weekNavigation} aria-label="Week navigation">
            <Link
              className={styles.weekNavigationLink}
              href={`/week?week=${previousWeekStart}`}
              scroll={false}
            >
              <span aria-hidden="true">←</span> Previous
            </Link>
            <Link
              aria-current={isCurrentWeek ? "date" : undefined}
              className={styles.weekNavigationLink}
              href="/week"
              scroll={false}
            >
              This week
            </Link>
            {isCurrentWeek ? (
              <span
                aria-disabled="true"
                className={styles.weekNavigationDisabled}
              >
                Next <span aria-hidden="true">→</span>
              </span>
            ) : (
              <Link
                className={styles.weekNavigationLink}
                href={`/week?week=${nextWeekStart}`}
                scroll={false}
              >
                Next <span aria-hidden="true">→</span>
              </Link>
            )}
          </nav>
        </div>
        {optimisticWeek.status === "ready" ? (
          <p className={styles.summary}>
            {optimisticWeek.rows.length}{" "}
            {optimisticWeek.rows.length === 1 ? "habit" : "habits"}
          </p>
        ) : null}
      </header>

      {notice ? (
        <div className={styles.notice} role="alert">
          <span>{notice}</span>
          <button
            className={styles.noticeDismiss}
            type="button"
            aria-label="Dismiss error message"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      ) : null}

      {optimisticWeek.status === "empty" ? (
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
                  {optimisticWeek.localDates.map((localDate) => {
                    const date = parseLocalDate(localDate);
                    const timing = getTiming(
                      localDate,
                      optimisticWeek.currentLocalDate,
                    );

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
                {optimisticWeek.rows.map((row) => (
                  <HabitRow
                    currentLocalDate={optimisticWeek.currentLocalDate}
                    key={row.id}
                    mutateCompletion={mutateCompletion}
                    pendingCells={pendingCells}
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
