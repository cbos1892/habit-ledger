"use client";

import {
  type CSSProperties,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";

import type {
  TodayHabit,
  TodaySection,
  TodayViewModel,
} from "../../../lib/today";
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

  const sections = today.sections.map((section) => {
    const habits = section.habits.map((habit) =>
      habit.id === update.habitId
        ? {
            ...habit,
            completed: update.completed,
            completionId: update.completed ? habit.completionId : null,
          }
        : habit,
    );

    return {
      ...section,
      habits,
      progress: {
        completedCount: habits.filter(({ completed }) => completed).length,
        totalCount: habits.length,
      },
    };
  });
  const habits = sections.flatMap(({ habits: sectionHabits }) => sectionHabits);
  const completedCount = habits.filter(({ completed }) => completed).length;

  return {
    ...today,
    completedCount,
    progress: { completedCount, totalCount: habits.length },
    sections,
  };
}

function getTodayHabits(today: TodayViewModel): readonly TodayHabit[] {
  return today.sections.flatMap(({ habits }) => habits);
}

function getDisplaySections(today: TodayViewModel): readonly TodaySection[] {
  if (today.status === "empty") return [];

  const standalone = today.sections.filter(
    (section) => section.kind === "standalone",
  );
  const routines = today.sections.filter(
    (section) => section.kind === "routine",
  );

  return [...standalone, ...routines];
}

function formatLocalDate(localDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${localDate}T00:00:00Z`));
}

function Progress({
  celebrating,
  completed,
  total,
}: {
  celebrating: boolean;
  completed: number;
  total: number;
}) {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  const perfect = completed === total && total > 0;
  const progressStyle = {
    "--today-progress": `${percentage}%`,
  } as CSSProperties;

  return (
    <section
      className={styles.progress}
      aria-labelledby="today-progress-title"
      data-celebrating={celebrating}
      data-perfect={perfect}
    >
      <div
        aria-label={`${completed} of ${total} habits complete`}
        aria-valuemax={total}
        aria-valuemin={0}
        aria-valuenow={completed}
        className={styles.progressRing}
        role="progressbar"
        style={progressStyle}
      >
        <span>
          <strong>{completed}</strong>
          <small>of {total}</small>
        </span>
      </div>
      <div className={styles.progressCopy}>
        <div className={styles.progressText}>
          <div className={styles.progressHeading}>
            <p className={styles.progressLabel} id="today-progress-title">
              Daily progress
            </p>
            <span
              aria-hidden="true"
              className={styles.progressMilestone}
              data-visible={perfect}
            >
              <span>★</span> Perfect day
            </span>
          </div>
          <p className={styles.progressMessage}>
            {perfect
              ? "All done for today. Nicely tended."
              : "A little progress is still progress."}
          </p>
        </div>
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
  const [celebrationMutation, setCelebrationMutation] = useState<number | null>(
    null,
  );
  const [showScrollFade, setShowScrollFade] = useState(false);
  const latestMutationByHabit = useRef(new Map<string, number>());
  const mutationSequence = useRef(0);
  const stickySentinelRef = useRef<HTMLDivElement>(null);
  const habits = getTodayHabits(optimisticToday);
  const displaySections = getDisplaySections(optimisticToday);
  const dateLabel = formatLocalDate(optimisticToday.localDate);
  const completionNotice = notice ? (
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
  ) : null;

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => setNotice(null), 8000);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (celebrationMutation === null) return;

    const timeout = window.setTimeout(() => setCelebrationMutation(null), 1800);

    return () => window.clearTimeout(timeout);
  }, [celebrationMutation]);

  useEffect(() => {
    const sentinel = stickySentinelRef.current;

    if (!sentinel || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => {
      setShowScrollFade(!entry.isIntersecting);
    });

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, []);

  function mutateCompletion(habitId: string) {
    const habit = habits.find(({ id }) => id === habitId);

    if (!habit) return;

    const nextCompleted = !habit.completed;
    const mutationId = ++mutationSequence.current;
    const completesToday =
      nextCompleted &&
      optimisticToday.totalCount > 0 &&
      optimisticToday.completedCount + 1 === optimisticToday.totalCount;
    latestMutationByHabit.current.set(habitId, mutationId);
    setNotice(null);
    setCelebrationMutation(completesToday ? mutationId : null);

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
        setCelebrationMutation((current) =>
          current === mutationId ? null : current,
        );
        setNotice({
          message: result.message,
        });
        return;
      }
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.srOnly} aria-atomic="true" aria-live="polite">
        {celebrationMutation === null
          ? null
          : "Perfect day. All scheduled habits are complete."}
      </div>
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

      {optimisticToday.status === "empty" ? (
        <>
          {completionNotice}
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
        </>
      ) : (
        <section className={styles.habits} aria-labelledby="today-habits-title">
          <div
            aria-hidden="true"
            className={styles.stickySentinel}
            ref={stickySentinelRef}
          />
          <div
            className={styles.stickyStack}
            data-fade-visible={showScrollFade}
            data-testid="today-sticky-stack"
          >
            <Progress
              celebrating={celebrationMutation !== null}
              completed={optimisticToday.completedCount}
              total={optimisticToday.totalCount}
            />
            <div className={styles.listHeading}>
              <h2 id="today-habits-title">Today&apos;s habits</h2>
              <p>Tap a habit to update it.</p>
            </div>
            {completionNotice}
          </div>
          <div className={styles.sections}>
            {displaySections.map((section) =>
              section.kind === "standalone" ? (
                <ul className={styles.habitList} key="standalone">
                  {section.habits.map((habit) => (
                    <HabitCard
                      habit={habit}
                      key={habit.id}
                      mutateCompletion={mutateCompletion}
                    />
                  ))}
                </ul>
              ) : (
                <RoutineCard
                  key={section.routine.id}
                  mutateCompletion={mutateCompletion}
                  section={section}
                />
              ),
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function HabitCard({
  habit,
  mutateCompletion,
}: {
  habit: TodayHabit;
  mutateCompletion: (habitId: string) => void;
}) {
  return (
    <li>
      <button
        className={styles.habitRow}
        type="button"
        aria-pressed={habit.completed}
        aria-label={`${habit.name}, ${habit.completed ? "complete" : "not complete"}`}
        onClick={() => mutateCompletion(habit.id)}
      >
        <span className={styles.habitIdentity}>
          <span className={styles.checkmark} aria-hidden="true">
            {habit.completed ? "✓" : ""}
          </span>
          <span className={styles.habitName}>{habit.name}</span>
        </span>
        <span className={styles.habitAction} aria-hidden="true">
          {habit.completed ? "Complete" : "Check in"}
        </span>
      </button>
    </li>
  );
}

function RoutineCard({
  mutateCompletion,
  section,
}: {
  mutateCompletion: (habitId: string) => void;
  section: Extract<TodaySection, { kind: "routine" }>;
}) {
  const { completedCount, totalCount } = section.progress;
  return (
    <section
      className={styles.routine}
      data-complete={completedCount === totalCount}
      aria-labelledby={`routine-${section.routine.id}-title`}
    >
      <header className={styles.routineHeading}>
        <span>
          <span
            className={styles.routineName}
            id={`routine-${section.routine.id}-title`}
          >
            {section.routine.name}
          </span>
          <span className={styles.routineProgress}>
            {completedCount} of {totalCount}
          </span>
        </span>
      </header>
      <ul className={styles.routineHabitList}>
        {section.habits.map((habit) => (
          <HabitCard
            habit={habit}
            key={habit.id}
            mutateCompletion={mutateCompletion}
          />
        ))}
      </ul>
    </section>
  );
}
