"use client";

import Link from "next/link";

import { Button, Card } from "@/components/ui";
import type { Routine } from "@/lib/habits";
import type {
  RoutineSummary,
  SetupHabit,
  SetupSection,
} from "@/lib/routine-view-models";

import styles from "./time-zone.module.css";

type FormAction = (formData: FormData) => Promise<void>;
type HabitListProps = {
  moveRoutineAction: FormAction;
  moveRoutineHabitAction: FormAction;
  moveStandaloneHabitAction: FormAction;
  restoreAction: FormAction;
  routines: readonly Routine[];
  sections: readonly SetupSection[];
};

function HabitId({ id }: { id: string }) {
  return <input name="habitId" type="hidden" value={id} />;
}

function HabitIdentity({ habit }: { habit: SetupHabit }) {
  return (
    <div className={styles.habitIdentityGroup}>
      <span className={styles.habitIcon} aria-hidden="true">
        {habit.icon}
      </span>
      <span className={styles.habitIdentity}>
        <span className={styles.habitTitleRow}>
          <span className={styles.habitName}>{habit.name}</span>
          <span
            aria-label={`${habit.color} color`}
            className={styles.habitColor}
            data-color={habit.color}
            role="img"
          />
        </span>
      </span>
    </div>
  );
}

function MoveControls({
  disabledDown,
  disabledUp,
  id,
  label,
  moveAction,
  target,
}: {
  disabledDown: boolean;
  disabledUp: boolean;
  id: string;
  label: string;
  moveAction: FormAction;
  target: "habit" | "routine";
}) {
  return (
    <div
      aria-label={`Reorder ${label}`}
      className={styles.moveControls}
      role="group"
    >
      <form action={moveAction}>
        <input name={`${target}Id`} type="hidden" value={id} />
        <input name="direction" type="hidden" value="up" />
        <Button
          aria-label={`Move ${label} up`}
          disabled={disabledUp}
          size="small"
          type="submit"
          variant="secondary"
        >
          ↑
        </Button>
      </form>
      <form action={moveAction}>
        <input name={`${target}Id`} type="hidden" value={id} />
        <input name="direction" type="hidden" value="down" />
        <Button
          aria-label={`Move ${label} down`}
          disabled={disabledDown}
          size="small"
          type="submit"
          variant="secondary"
        >
          ↓
        </Button>
      </form>
    </div>
  );
}

function HabitRow({
  habit,
  index,
  moveAction,
  total,
}: {
  habit: SetupHabit;
  index: number;
  moveAction: FormAction;
  total: number;
}) {
  return (
    <Card className={styles.habitCard} padding="compact">
      <HabitIdentity habit={habit} />
      <div
        aria-label={`Controls for ${habit.name}`}
        className={styles.habitControls}
        role="group"
      >
        <MoveControls
          disabledDown={index === total - 1}
          disabledUp={index === 0}
          id={habit.id}
          label={habit.name}
          moveAction={moveAction}
          target="habit"
        />
        <Link
          aria-label={`Edit ${habit.name}`}
          className={styles.iconControl}
          href={`/setup/habits/${habit.id}/edit`}
        >
          <span aria-hidden="true">✐</span>
        </Link>
      </div>
    </Card>
  );
}

function ActiveHabitList({
  habits,
  moveAction,
}: {
  habits: readonly SetupHabit[];
  moveAction: FormAction;
}) {
  if (habits.length === 0)
    return <p className={styles.emptyRoutine}>No active habits here yet.</p>;
  return (
    <ul className={styles.habitList}>
      {habits.map((habit, index) => (
        <li key={habit.id}>
          <HabitRow
            habit={habit}
            index={index}
            moveAction={moveAction}
            total={habits.length}
          />
        </li>
      ))}
    </ul>
  );
}

function RoutineContainer({
  index,
  moveRoutineAction,
  moveRoutineHabitAction,
  routine,
  routines,
  section,
}: {
  index: number;
  moveRoutineAction: FormAction;
  moveRoutineHabitAction: FormAction;
  routine: RoutineSummary;
  routines: readonly Routine[];
  section: Extract<SetupSection, { kind: "routine" }>;
}) {
  return (
    <section className={styles.routineCard}>
      <div className={styles.routineHeader}>
        <div>
          <div className={styles.routineTitleRow}>
            <span aria-hidden="true" className={styles.routineIcon}>
              {routine.icon ?? "◌"}
            </span>
            <h3>{routine.name}</h3>
            <Link
              aria-label={`Add a habit to ${routine.name}`}
              className={styles.plusControl}
              href={`/setup/habits/new?routineId=${routine.id}`}
            >
              <span aria-hidden="true">+</span>
            </Link>
          </div>
          <p>
            {section.activeHabits.length} active habit
            {section.activeHabits.length === 1 ? "" : "s"}
          </p>
        </div>
        <div
          aria-label={`Controls for ${routine.name} routine`}
          className={styles.routineControls}
          role="group"
        >
          <MoveControls
            disabledDown={index === routines.length - 1}
            disabledUp={index === 0}
            id={routine.id}
            label={`${routine.name} routine`}
            moveAction={moveRoutineAction}
            target="routine"
          />
          <Link
            aria-label={`Edit ${routine.name} routine`}
            className={styles.iconControl}
            href={`/setup/routines/${routine.id}/edit`}
          >
            <span aria-hidden="true">✐</span>
          </Link>
        </div>
      </div>
      <ActiveHabitList
        habits={section.activeHabits}
        moveAction={moveRoutineHabitAction}
      />
    </section>
  );
}

export function HabitList({
  moveRoutineAction,
  moveRoutineHabitAction,
  moveStandaloneHabitAction,
  restoreAction,
  routines,
  sections,
}: HabitListProps) {
  const standalone = sections.find(
    (section): section is Extract<SetupSection, { kind: "standalone" }> =>
      section.kind === "standalone",
  );
  const routineSections = new Map(
    sections.flatMap((section) =>
      section.kind === "routine"
        ? [[section.routine.id, section] as const]
        : [],
    ),
  );
  const archivedHabits = sections.flatMap((section) =>
    section.archivedHabits.map((habit) => ({ habit, section })),
  );
  return (
    <div className={styles.habitLists}>
      <section className={styles.standaloneSection}>
        <ActiveHabitList
          habits={standalone?.activeHabits ?? []}
          moveAction={moveStandaloneHabitAction}
        />
      </section>
      <div className={styles.routineList}>
        {routines.map((routine, index) => {
          const section = routineSections.get(routine.id) ?? {
            activeHabits: [],
            archivedHabits: [],
            kind: "routine" as const,
            routine: {
              displayOrder: routine.display_order,
              icon: routine.icon ?? "◌",
              id: routine.id,
              name: routine.name,
            },
          };
          return (
            <RoutineContainer
              index={index}
              key={routine.id}
              moveRoutineAction={moveRoutineAction}
              moveRoutineHabitAction={moveRoutineHabitAction}
              routine={section.routine}
              routines={routines}
              section={section}
            />
          );
        })}
      </div>
      <details className={styles.archivedHabits}>
        <summary>
          Archived habits <span>{archivedHabits.length}</span>
        </summary>
        {archivedHabits.length > 0 ? (
          <ul className={styles.habitList}>
            {archivedHabits.map(({ habit, section }) => (
              <li key={habit.id}>
                <Card className={styles.archivedHabitCard} padding="compact">
                  <HabitIdentity habit={habit} />
                  <p className={styles.archivedContext}>
                    {section.kind === "routine"
                      ? `${section.routine.name} routine`
                      : "Standalone"}
                  </p>
                  <form action={restoreAction}>
                    <HabitId id={habit.id} />
                    <Button size="small" type="submit" variant="secondary">
                      Restore
                    </Button>
                  </form>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyArchive}>
            Archived habits will appear here.
          </p>
        )}
      </details>
    </div>
  );
}
