"use client";

import Link from "next/link";
import { type CSSProperties, useState, useSyncExternalStore } from "react";

import styles from "./today-concept.module.css";

type Appearance = "light" | "dark" | "system";
type Scenario = "partial" | "complete" | "empty" | "loading" | "error";
type RoutineTone = "adobe" | "sage" | "teal" | "mauve";

type Habit = Readonly<{
  id: string;
  name: string;
}>;

type Routine = Readonly<{
  id: string;
  name: string;
  tone: RoutineTone;
  icon: "morning" | "anytime" | "evening";
  habits: readonly Habit[];
}>;

const routines: readonly Routine[] = [
  {
    id: "morning",
    name: "Morning",
    tone: "adobe",
    icon: "morning",
    habits: [
      { id: "walk", name: "Morning walk" },
      { id: "water", name: "Drink water" },
    ],
  },
  {
    id: "anytime",
    name: "Anytime",
    tone: "sage",
    icon: "anytime",
    habits: [
      { id: "read", name: "Read 20 minutes" },
      { id: "stretch", name: "Stretch" },
    ],
  },
  {
    id: "evening",
    name: "Evening",
    tone: "mauve",
    icon: "evening",
    habits: [{ id: "plan", name: "Plan tomorrow" }],
  },
];

const allHabitIds = routines.flatMap(({ habits }) =>
  habits.map(({ id }) => id),
);
const partialHabitIds = ["walk", "water", "stretch"];

const navigation = [
  { href: "/today", icon: "today", label: "Today" },
  { href: "/week", icon: "week", label: "Week" },
  { href: "/stats", icon: "stats", label: "Stats" },
  { href: "/setup", icon: "setup", label: "Setup" },
] as const;

function resolveSystemAppearance() {
  if (typeof window === "undefined" || !window.matchMedia) return "light";

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function subscribeToSystemAppearance(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);

  return () => media.removeEventListener("change", onChange);
}

function RoutineIcon({ icon }: { icon: Routine["icon"] }) {
  if (icon === "morning") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3.25" />
        <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
      </svg>
    );
  }

  if (icon === "evening") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M19.7 15.3A8.5 8.5 0 0 1 8.7 4.3 8.5 8.5 0 1 0 19.7 15.3Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 5.5h4.25A2.75 2.75 0 0 1 12 8.25V20a3.5 3.5 0 0 0-3.5-3.5H5Z" />
      <path d="M19 5.5h-4.25A2.75 2.75 0 0 0 12 8.25V20a3.5 3.5 0 0 1 3.5-3.5H19Z" />
    </svg>
  );
}

function NavigationIcon({
  name,
}: {
  name: (typeof navigation)[number]["icon"];
}) {
  const common = {
    "aria-hidden": true,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.7,
    viewBox: "0 0 24 24",
  };

  if (name === "today") {
    return (
      <svg {...common}>
        <rect height="16" rx="2" width="17" x="3.5" y="5" />
        <path d="M7.5 3v4M16.5 3v4M3.5 9.5h17" />
      </svg>
    );
  }

  if (name === "week") {
    return (
      <svg {...common}>
        <rect height="17" rx="2" width="17" x="3.5" y="3.5" />
        <path d="M3.5 9h17M9 9v11.5M15 9v11.5M3.5 15h17" />
      </svg>
    );
  }

  if (name === "stats") {
    return (
      <svg {...common}>
        <path d="M5 20V12M12 20V5M19 20V9" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 14.5a7.5 7.5 0 0 0 0-5l2-1.2-2-3.4-2 1.2a7.5 7.5 0 0 0-4.3-2.5V1.5H8.8v2.2A7.5 7.5 0 0 0 5 6.1L3 4.9 1 8.3l2 1.2a7.5 7.5 0 0 0 0 5l-2 1.2 2 3.4 2-1.2a7.5 7.5 0 0 0 3.8 2.4v2.2h3.9v-2.2A7.5 7.5 0 0 0 17 17.9l2 1.2 2-3.4Z" />
    </svg>
  );
}

function Brand() {
  return (
    <div className={styles.brand} aria-label="Habit Ledger">
      <span className={styles.brandMark} aria-hidden="true">
        H
      </span>
      <span>Habit Ledger</span>
    </div>
  );
}

function Navigation() {
  return (
    <nav className={styles.navigation} aria-label="Prototype navigation">
      <ul>
        {navigation.map((item) => (
          <li key={item.href}>
            <Link
              aria-current={item.icon === "today" ? "page" : undefined}
              href={item.href}
            >
              <NavigationIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function PrototypeControls({
  appearance,
  onAppearanceChange,
  onScenarioChange,
  scenario,
}: {
  appearance: Appearance;
  onAppearanceChange: (appearance: Appearance) => void;
  onScenarioChange: (scenario: Scenario) => void;
  scenario: Scenario;
}) {
  return (
    <aside className={styles.prototypeControls} aria-label="Prototype controls">
      <p>Today concept</p>
      <fieldset>
        <legend>Appearance</legend>
        <div>
          {(["light", "dark", "system"] as const).map((option) => (
            <button
              aria-pressed={appearance === option}
              key={option}
              onClick={() => onAppearanceChange(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        <span>State</span>
        <select
          onChange={(event) => onScenarioChange(event.target.value as Scenario)}
          value={scenario}
        >
          <option value="partial">Partial progress</option>
          <option value="complete">Complete day</option>
          <option value="empty">Empty day</option>
          <option value="loading">Loading</option>
          <option value="error">Error</option>
        </select>
      </label>
    </aside>
  );
}

function Progress({ completed, total }: { completed: number; total: number }) {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  const progressStyle = {
    "--concept-progress": `${percentage}%`,
  } as CSSProperties;

  return (
    <section
      className={styles.progress}
      aria-labelledby="concept-progress-title"
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
          <strong>
            {completed} of {total}
          </strong>
          <small>complete</small>
        </span>
      </div>
      <div className={styles.progressCopy}>
        <h2 id="concept-progress-title">
          {completed === total
            ? "You showed up today."
            : "You’re making progress."}
        </h2>
        <p>
          {completed === total
            ? "Every planned habit is complete."
            : "Keep going. Your habits add up."}
        </p>
      </div>
    </section>
  );
}

function RoutineSection({
  completedIds,
  onToggle,
  routine,
}: {
  completedIds: ReadonlySet<string>;
  onToggle: (habitId: string) => void;
  routine: Routine;
}) {
  const completedCount = routine.habits.filter(({ id }) =>
    completedIds.has(id),
  ).length;

  return (
    <section className={styles.routine} data-tone={routine.tone}>
      <header className={styles.routineHeading}>
        <span className={styles.routineIdentity}>
          <RoutineIcon icon={routine.icon} />
          <h2>{routine.name}</h2>
        </span>
        <p>
          {completedCount} of {routine.habits.length} complete
        </p>
      </header>
      <ul className={styles.habitList}>
        {routine.habits.map((habit) => {
          const completed = completedIds.has(habit.id);

          return (
            <li key={habit.id}>
              <button
                aria-pressed={completed}
                className={styles.habitRow}
                onClick={() => onToggle(habit.id)}
                type="button"
              >
                <span className={styles.check} aria-hidden="true">
                  {completed ? "✓" : ""}
                </span>
                <span className={styles.habitName}>{habit.name}</span>
                <span className={styles.habitAction}>
                  {completed ? "Completed" : "Mark complete"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function LoadingState() {
  return (
    <div className={styles.loadingState} aria-busy="true">
      <p className={styles.srOnly} role="status">
        Loading today’s habits
      </p>
      <span className={styles.loadingProgress} />
      <span className={styles.loadingLabel} />
      <span className={styles.loadingRow} />
      <span className={styles.loadingRow} />
      <span className={styles.loadingLabel} />
      <span className={styles.loadingRow} />
    </div>
  );
}

function EmptyState() {
  return (
    <section className={styles.messageState}>
      <span className={styles.messageMark} aria-hidden="true">
        ○
      </span>
      <p className={styles.messageKicker}>An open day</p>
      <h2>Nothing is scheduled today.</h2>
      <p>Take the day as it comes, or adjust your schedule in Setup.</p>
      <Link href="/setup">Review your habits</Link>
    </section>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className={styles.messageState} role="alert">
      <span className={styles.messageMark} aria-hidden="true">
        ↻
      </span>
      <p className={styles.messageKicker}>Could not load today</p>
      <h2>Your habits are temporarily unavailable.</h2>
      <p>Your progress is safe. Try loading this view again.</p>
      <button onClick={onRetry} type="button">
        Try again
      </button>
    </section>
  );
}

export function TodayConcept({ className = "" }: { className?: string }) {
  const [appearance, setAppearance] = useState<Appearance>("light");
  const [scenario, setScenario] = useState<Scenario>("partial");
  const [completedIds, setCompletedIds] = useState(
    () => new Set(partialHabitIds),
  );
  const systemAppearance = useSyncExternalStore(
    subscribeToSystemAppearance,
    resolveSystemAppearance,
    () => "light",
  );
  const resolvedAppearance =
    appearance === "system" ? systemAppearance : appearance;

  const completedCount = completedIds.size;

  function changeScenario(nextScenario: Scenario) {
    setScenario(nextScenario);
    if (nextScenario === "complete") setCompletedIds(new Set(allHabitIds));
    if (nextScenario === "partial") setCompletedIds(new Set(partialHabitIds));
  }

  function renderContent() {
    if (scenario === "loading") return <LoadingState />;
    if (scenario === "empty") return <EmptyState />;
    if (scenario === "error") {
      return <ErrorState onRetry={() => changeScenario("partial")} />;
    }

    return (
      <>
        <Progress completed={completedCount} total={allHabitIds.length} />
        <div className={styles.routines}>
          {routines.map((routine) => (
            <RoutineSection
              completedIds={completedIds}
              key={routine.id}
              onToggle={(habitId) => {
                setScenario("partial");
                setCompletedIds((current) => {
                  const next = new Set(current);
                  if (next.has(habitId)) next.delete(habitId);
                  else next.add(habitId);
                  return next;
                });
              }}
              routine={routine}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <div
      className={`${styles.prototype} ${className}`}
      data-appearance={resolvedAppearance}
    >
      <a className={styles.skipLink} href="#today-concept-content">
        Skip to Today concept
      </a>
      <PrototypeControls
        appearance={appearance}
        onAppearanceChange={setAppearance}
        onScenarioChange={changeScenario}
        scenario={scenario}
      />
      <div className={styles.shell}>
        <header className={styles.mobileHeader}>
          <Brand />
          <span className={styles.prototypeLabel}>Concept</span>
        </header>
        <aside className={styles.sidebar}>
          <Brand />
          <Navigation />
          <p className={styles.coachingLine}>Small steps build a good day.</p>
        </aside>
        <main className={styles.main} id="today-concept-content" tabIndex={-1}>
          <header className={styles.pageHeading}>
            <div>
              <p className={styles.date}>Wednesday, September 9</p>
              <h1>Today</h1>
            </div>
            <p className={styles.headingAside}>
              Small steps
              <br />
              build a good day.
            </p>
          </header>
          {renderContent()}
        </main>
        <div className={styles.mobileNavigation}>
          <Navigation />
        </div>
      </div>
    </div>
  );
}
