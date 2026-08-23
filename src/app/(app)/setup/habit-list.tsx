"use client";

import Link from "next/link";

import { Button, Card } from "@/components/ui";
import type { Habit } from "@/lib/habits";

import styles from "./time-zone.module.css";

type HabitAction = (formData: FormData) => Promise<void>;

type HabitListProps = {
  activeHabits: Habit[];
  archiveAction: HabitAction;
  archivedHabits: Habit[];
  moveAction: HabitAction;
  restoreAction: HabitAction;
};

function HabitIdentity({ habit }: { habit: Habit }) {
  return (
    <div className={styles.habitIdentityGroup}>
      <span className={styles.habitIcon} aria-hidden="true">
        {habit.icon}
      </span>
      <span className={styles.habitIdentity}>
        <span className={styles.habitName}>{habit.name}</span>
        <span className={styles.habitMeta}>Starts {habit.start_date}</span>
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

export function HabitList({
  activeHabits,
  archiveAction,
  archivedHabits,
  moveAction,
  restoreAction,
}: HabitListProps) {
  return (
    <div className={styles.habitLists}>
      {activeHabits.length > 0 ? (
        <ul className={styles.habitList}>
          {activeHabits.map((habit, index) => (
            <li key={habit.id}>
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
                        disabled={index === activeHabits.length - 1}
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
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card className={styles.emptyHabits} padding="compact">
          <p>No active habits. Create one small thing you want to return to.</p>
        </Card>
      )}

      <details
        className={styles.archivedHabits}
        open={archivedHabits.length > 0}
      >
        <summary>
          Archived habits <span>{archivedHabits.length}</span>
        </summary>
        {archivedHabits.length > 0 ? (
          <ul className={styles.habitList}>
            {archivedHabits.map((habit) => (
              <li key={habit.id}>
                <Card className={styles.archivedHabitCard} padding="compact">
                  <HabitIdentity habit={habit} />
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
