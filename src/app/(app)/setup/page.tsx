import type { Metadata } from "next";
import Link from "next/link";

import { Feedback } from "../../../components/ui";
import { requireCurrentUser } from "../../../lib/auth/current-user";
import { getSetupViewModel } from "../../../lib/habits";
import { getNavigationItem } from "../../../lib/navigation";

import { archiveHabit, moveHabit, restoreHabit } from "./habit-actions";
import { HabitList } from "./habit-list";
import styles from "./time-zone.module.css";

const route = getNavigationItem("setup");
const habitFeedbackTitles: Record<string, string> = {
  archived: "Habit archived",
  created: "Habit created",
  moved: "Habit order updated",
  restored: "Habit restored",
  updated: "Habit updated",
};

export const metadata: Metadata = {
  title: route.label,
  description: route.description,
};

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ habit?: string | string[] }>;
}) {
  const user = await requireCurrentUser();
  const [setup, query] = await Promise.all([
    getSetupViewModel(user.id),
    searchParams,
  ]);
  const activeHabits = setup.sections.flatMap((section) =>
    section.activeHabits.map((habit) => ({
      archived_at: habit.archivedAt,
      color: habit.color,
      display_order: habit.displayOrder,
      icon: habit.icon,
      id: habit.id,
      name: habit.name,
      routine_display_order: habit.routineDisplayOrder,
      start_date: habit.startDate,
      weekdays: [...habit.weekdays],
    })),
  );
  const archivedHabits = setup.sections.flatMap((section) =>
    section.archivedHabits.map((habit) => ({
      archived_at: habit.archivedAt,
      color: habit.color,
      display_order: habit.displayOrder,
      icon: habit.icon,
      id: habit.id,
      name: habit.name,
      routine_display_order: habit.routineDisplayOrder,
      start_date: habit.startDate,
      weekdays: [...habit.weekdays],
    })),
  );
  const habitStatus = Array.isArray(query.habit) ? query.habit[0] : query.habit;
  const habitFeedbackTitle = habitStatus
    ? habitFeedbackTitles[habitStatus]
    : undefined;

  return (
    <section aria-labelledby="page-title" className={styles.settings}>
      <div className="page-heading">
        <p className="page-eyebrow">Make it yours</p>
        <h1 className="page-title" id="page-title">
          Setup
        </h1>
        <p className="page-description">{route.description}</p>
      </div>

      {habitFeedbackTitle ? (
        <Feedback title={habitFeedbackTitle} tone="success">
          <p>
            {habitStatus === "archived"
              ? "The habit is out of active views, and its history is safe."
              : "Your Setup list is up to date."}
          </p>
        </Feedback>
      ) : null}

      <section aria-labelledby="habits-title" className={styles.habitsSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="habits-title">Habits</h2>
            <p>Create a clear identity and choose when each habit appears.</p>
          </div>
          <Link className={styles.primaryLink} href="/setup/habits/new">
            New habit
          </Link>
        </div>

        <HabitList
          activeHabits={activeHabits}
          archiveAction={archiveHabit}
          archivedHabits={archivedHabits}
          moveAction={moveHabit}
          restoreAction={restoreHabit}
        />
      </section>

      <Link className={styles.advancedSettingsLink} href="/settings/time-zone">
        Advanced settings <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
