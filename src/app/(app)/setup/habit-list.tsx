"use client";

import Link from "next/link";

import { Button, Card } from "@/components/ui";
import type { Routine } from "@/lib/habits";
import type {
  RoutineSummary,
  SetupHabit,
  SetupSection,
} from "@/lib/routine-view-models";

import type { RoutineFormState } from "./habit-actions";
import { RoutineNameForm } from "./routine-name-form";
import styles from "./time-zone.module.css";

type FormAction = (formData: FormData) => Promise<void>;
type RenameAction = (
  routineId: string,
  state: RoutineFormState,
  formData: FormData,
) => Promise<RoutineFormState>;

type HabitListProps = {
  archiveAction: FormAction;
  deleteRoutineAction: FormAction;
  moveRoutineAction: FormAction;
  moveRoutineHabitAction: FormAction;
  moveStandaloneHabitAction: FormAction;
  renameRoutineAction: RenameAction;
  restoreAction: FormAction;
  routines: readonly Routine[];
  sections: readonly SetupSection[];
  setHabitRoutineAction: FormAction;
};

function HabitIdentity({ habit }: { habit: SetupHabit }) {
  return (
    <div className={styles.habitIdentityGroup}>
      <span className={styles.habitIcon} aria-hidden="true">
        {habit.icon}
      </span>
      <span className={styles.habitIdentity}>
        <span className={styles.habitName}>{habit.name}</span>
        <span className={styles.habitMeta}>Starts {habit.startDate}</span>
      </span>
      <span
        aria-label={`${habit.color} color`}
        className={styles.habitColor}
        data-color={habit.color}
        role="img"
      />
    </div>
  );
}

function HabitId({ id }: { id: string }) {
  return <input name="habitId" type="hidden" value={id} />;
}

function RoutineId({ id }: { id: string }) {
  return <input name="routineId" type="hidden" value={id} />;
}

function HabitCard({
  archiveAction,
  currentRoutineId,
  habit,
  index,
  moveAction,
  routines,
  setHabitRoutineAction,
  total,
}: {
  archiveAction: FormAction;
  currentRoutineId: string | null;
  habit: SetupHabit;
  index: number;
  moveAction: FormAction;
  routines: readonly Routine[];
  setHabitRoutineAction: FormAction;
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
        <div
          aria-label={`Reorder ${habit.name}`}
          className={styles.moveControls}
          role="group"
        >
          <form action={moveAction}>
            <HabitId id={habit.id} />
            <input name="direction" type="hidden" value="up" />
            <Button
              aria-label={`Move ${habit.name} up`}
              disabled={index === 0}
              size="small"
              type="submit"
              variant="secondary"
            >
              ↑
            </Button>
          </form>
          <form action={moveAction}>
            <HabitId id={habit.id} />
            <input name="direction" type="hidden" value="down" />
            <Button
              aria-label={`Move ${habit.name} down`}
              disabled={index === total - 1}
              size="small"
              type="submit"
              variant="secondary"
            >
              ↓
            </Button>
          </form>
        </div>
        <Link
          className={styles.editLink}
          href={`/setup/habits/${habit.id}/edit`}
        >
          Edit
        </Link>
        <form
          action={archiveAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                `Archive ${habit.name}? Its completion history will be kept.`,
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <HabitId id={habit.id} />
          <Button size="small" type="submit" variant="danger">
            Archive
          </Button>
        </form>
      </div>
      {routines.length > 0 ? (
        <form action={setHabitRoutineAction} className={styles.membershipForm}>
          <HabitId id={habit.id} />
          <label htmlFor={`habit-routine-${habit.id}`}>Routine</label>
          <select
            defaultValue={currentRoutineId ?? ""}
            id={`habit-routine-${habit.id}`}
            name="routineId"
          >
            <option value="">Standalone</option>
            {routines.map((routine) => (
              <option key={routine.id} value={routine.id}>
                {routine.name}
              </option>
            ))}
          </select>
          <Button size="small" type="submit" variant="secondary">
            Move
          </Button>
        </form>
      ) : null}
    </Card>
  );
}

function ActiveHabitList({
  archiveAction,
  currentRoutineId,
  habits,
  moveAction,
  routines,
  setHabitRoutineAction,
}: {
  archiveAction: FormAction;
  currentRoutineId: string | null;
  habits: readonly SetupHabit[];
  moveAction: FormAction;
  routines: readonly Routine[];
  setHabitRoutineAction: FormAction;
}) {
  if (habits.length === 0) {
    return <p className={styles.emptyRoutine}>No active habits here yet.</p>;
  }

  return (
    <ul className={styles.habitList}>
      {habits.map((habit, index) => (
        <li key={habit.id}>
          <HabitCard
            archiveAction={archiveAction}
            currentRoutineId={currentRoutineId}
            habit={habit}
            index={index}
            moveAction={moveAction}
            routines={routines}
            setHabitRoutineAction={setHabitRoutineAction}
            total={habits.length}
          />
        </li>
      ))}
    </ul>
  );
}

function RoutineContainer({
  archiveAction,
  deleteRoutineAction,
  index,
  moveRoutineAction,
  moveRoutineHabitAction,
  renameRoutineAction,
  routine,
  routines,
  section,
  setHabitRoutineAction,
}: {
  archiveAction: FormAction;
  deleteRoutineAction: FormAction;
  index: number;
  moveRoutineAction: FormAction;
  moveRoutineHabitAction: FormAction;
  renameRoutineAction: RenameAction;
  routine: RoutineSummary;
  routines: readonly Routine[];
  section: Extract<SetupSection, { kind: "routine" }>;
  setHabitRoutineAction: FormAction;
}) {
  return (
    <Card className={styles.routineCard}>
      <div className={styles.routineHeader}>
        <div>
          <p className={styles.routineEyebrow}>Routine</p>
          <h3>{routine.name}</h3>
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
          <form action={moveRoutineAction}>
            <RoutineId id={routine.id} />
            <input name="direction" type="hidden" value="up" />
            <Button
              aria-label={`Move ${routine.name} routine up`}
              disabled={index === 0}
              size="small"
              type="submit"
              variant="secondary"
            >
              ↑
            </Button>
          </form>
          <form action={moveRoutineAction}>
            <RoutineId id={routine.id} />
            <input name="direction" type="hidden" value="down" />
            <Button
              aria-label={`Move ${routine.name} routine down`}
              disabled={index === routines.length - 1}
              size="small"
              type="submit"
              variant="secondary"
            >
              ↓
            </Button>
          </form>
          <form
            action={deleteRoutineAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  `Delete ${routine.name}? Its habits will become standalone. Their schedules and history will be kept.`,
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <RoutineId id={routine.id} />
            <Button size="small" type="submit" variant="danger">
              Delete
            </Button>
          </form>
        </div>
      </div>

      <RoutineNameForm
        action={renameRoutineAction.bind(null, routine.id)}
        initialName={routine.name}
        mode="rename"
        routineId={routine.id}
      />

      <div className={styles.routineHabitHeading}>
        <h4>Habits</h4>
        <Link
          className={styles.textLink}
          href={`/setup/habits/new?routineId=${routine.id}`}
        >
          New habit here
        </Link>
      </div>
      <ActiveHabitList
        archiveAction={archiveAction}
        currentRoutineId={routine.id}
        habits={section.activeHabits}
        moveAction={moveRoutineHabitAction}
        routines={routines}
        setHabitRoutineAction={setHabitRoutineAction}
      />
    </Card>
  );
}

export function HabitList({
  archiveAction,
  deleteRoutineAction,
  moveRoutineAction,
  moveRoutineHabitAction,
  moveStandaloneHabitAction,
  renameRoutineAction,
  restoreAction,
  routines,
  sections,
  setHabitRoutineAction,
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
      <section
        aria-labelledby="standalone-title"
        className={styles.standaloneSection}
      >
        <div className={styles.subsectionHeading}>
          <div>
            <h3 id="standalone-title">Standalone</h3>
            <p>Habits that are not part of a routine.</p>
          </div>
          <Link className={styles.textLink} href="/setup/habits/new">
            New habit
          </Link>
        </div>
        <ActiveHabitList
          archiveAction={archiveAction}
          currentRoutineId={null}
          habits={standalone?.activeHabits ?? []}
          moveAction={moveStandaloneHabitAction}
          routines={routines}
          setHabitRoutineAction={setHabitRoutineAction}
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
              id: routine.id,
              name: routine.name,
            },
          };

          return (
            <RoutineContainer
              archiveAction={archiveAction}
              deleteRoutineAction={deleteRoutineAction}
              index={index}
              key={routine.id}
              moveRoutineAction={moveRoutineAction}
              moveRoutineHabitAction={moveRoutineHabitAction}
              renameRoutineAction={renameRoutineAction}
              routine={section.routine}
              routines={routines}
              section={section}
              setHabitRoutineAction={setHabitRoutineAction}
            />
          );
        })}
      </div>

      <details
        className={styles.archivedHabits}
        open={archivedHabits.length > 0}
      >
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
                  <div
                    aria-label={`Controls for ${habit.name}`}
                    className={styles.habitControls}
                    role="group"
                  >
                    <form action={restoreAction}>
                      <HabitId id={habit.id} />
                      <Button size="small" type="submit" variant="secondary">
                        Restore
                      </Button>
                    </form>
                  </div>
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
