"use client";

import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";

import type { TodayViewModel } from "../../../lib/today";
import { setHabitCompletion } from "./completion-actions";
import styles from "./today.module.css";

type TodayViewProps = Readonly<{
  today: TodayViewModel;
}>;

type CompletionNotice = Readonly<{
  message: string;
}>;

type OptimisticCompletion = Readonly<{
  habitId: string;
  completed: boolean;
}>;

function updateOptimisticCompletion(
  today: TodayViewModel,
  update: OptimisticCompletion,
): TodayViewModel {
  if (today.status === "empty") return today;

  const habits = today.habits.map((habit) =>
    habit.id === update.habitId
      ? {
          ...habit,
          completed: update.completed,
          completionId: update.completed ? habit.completionId : null,
        }
      : habit,
  );

  return {
    ...today,
    completedCount: habits.filter(({ completed }) => completed).length,
    habits,
  };
}

function formatLocalDate(localDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${localDate}T00:00:00Z`));
}

function Progress({ completed, total }: { completed: number; total: number }) {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <section className={styles.progress} aria-labelledby="today-progress-title">
      <div className={styles.progressCopy}>
        <div className={styles.progressText}>
          <p className={styles.progressLabel} id="today-progress-title">
            Daily progress
          </p>
          <p className={styles.progressMessage}>
            {completed === total && total > 0
              ? "All done for today. Nicely tended."
              : "A little progress is still progress."}
          </p>
        </div>
        <p
          className={styles.progressCount}
          aria-label={`${completed} of ${total} habits complete`}
        >
          <strong>{completed}</strong>
          <span> / {total}</span>
        </p>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label="Habits completed today"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
      >
        <span
          className={styles.progressFill}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </section>
  );
}

export function TodayView({ today }: TodayViewProps) {
  const [optimisticToday, setOptimisticCompletion] = useOptimistic(
    today,
    updateOptimisticCompletion,
  );
  const [, startTransition] = useTransition();
  const [notice, setNotice] = useState<CompletionNotice | null>(null);
  const latestMutationByHabit = useRef(new Map<string, number>());
  const mutationSequence = useRef(0);
  const dateLabel = formatLocalDate(optimisticToday.localDate);

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => setNotice(null), 8000);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  function mutateCompletion(habitId: string) {
    const habit = optimisticToday.habits.find(({ id }) => id === habitId);

    if (!habit) return;

    const nextCompleted = !habit.completed;
    const mutationId = ++mutationSequence.current;
    latestMutationByHabit.current.set(habitId, mutationId);
    setNotice(null);

    startTransition(async () => {
      setOptimisticCompletion({ habitId, completed: nextCompleted });

      let result;

      try {
        result = await setHabitCompletion(habitId, nextCompleted);
      } catch {
        result = {
          status: "error" as const,
          message:
            "We couldn't update this habit. Your previous check-in is restored.",
        };
      }

      if (latestMutationByHabit.current.get(habitId) !== mutationId) return;

      if (result.status === "error") {
        setNotice({
          message: result.message,
        });
        return;
      }
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Daily check-in</p>
          <h1 className={styles.title}>Today</h1>
          <p className={styles.date}>{dateLabel}</p>
        </div>
        {optimisticToday.status === "ready" ? (
          <p className={styles.summary}>
            {optimisticToday.totalCount} scheduled{" "}
            {optimisticToday.totalCount === 1 ? "habit" : "habits"}
          </p>
        ) : null}
      </header>

      {notice ? (
        <div className={styles.notice} role="alert">
          <span>{notice.message}</span>
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

      {optimisticToday.status === "empty" ? (
        <section className={styles.empty} aria-labelledby="empty-title">
          <span className={styles.emptyIcon} aria-hidden="true">
            ☀️
          </span>
          <p className={styles.emptyEyebrow}>An open day</p>
          <h2 className={styles.emptyTitle} id="empty-title">
            Nothing is scheduled for today.
          </h2>
          <p className={styles.emptyCopy}>
            Enjoy the breathing room. Your habits will be here on their next
            scheduled day.
          </p>
        </section>
      ) : (
        <>
          <Progress
            completed={optimisticToday.completedCount}
            total={optimisticToday.totalCount}
          />
          <section
            className={styles.habits}
            aria-labelledby="today-habits-title"
          >
            <div className={styles.listHeading}>
              <h2 id="today-habits-title">Today&apos;s habits</h2>
              <p>Choose a card to update it.</p>
            </div>
            <ul className={styles.habitList}>
              {optimisticToday.habits.map((habit) => (
                <li key={habit.id}>
                  <button
                    className={styles.habitCard}
                    data-color={habit.color}
                    type="button"
                    aria-pressed={habit.completed}
                    aria-label={`${habit.name}, ${habit.completed ? "complete" : "not complete"}`}
                    onClick={() => mutateCompletion(habit.id)}
                  >
                    <span className={styles.habitIdentity}>
                      <span className={styles.habitIcon} aria-hidden="true">
                        {habit.icon}
                      </span>
                      <span className={styles.habitName}>{habit.name}</span>
                    </span>
                    <span className={styles.completion} aria-hidden="true">
                      <span className={styles.checkmark}>
                        {habit.completed ? "✓" : ""}
                      </span>
                      <span>{habit.completed ? "Complete" : "Check in"}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
