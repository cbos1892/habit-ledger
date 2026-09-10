import type { Metadata } from "next";
import Link from "next/link";

import { Feedback } from "../../../components/ui";
import { requireCurrentUser } from "../../../lib/auth/current-user";
import { getSetupViewModel } from "../../../lib/habits";
import { getNavigationItem } from "../../../lib/navigation";

import {
  createRoutine,
  moveHabit,
  moveRoutine,
  moveRoutineHabit,
  restoreHabit,
} from "./habit-actions";
import { HabitList } from "./habit-list";
import { RoutineNameForm } from "./routine-name-form";
import styles from "./time-zone.module.css";

const route = getNavigationItem("setup");
const habitFeedbackTitles: Record<string, string> = {
  archived: "Habit archived",
  created: "Habit created",
  moved: "Habit order updated",
  restored: "Habit restored",
  updated: "Habit updated",
};
const routineFeedback: Record<
  string,
  { message: string; title: string; tone: "danger" | "success" }
> = {
  assigned: {
    message: "The habit is now in the selected routine.",
    title: "Habit moved",
    tone: "success",
  },
  created: {
    message: "The new routine is ready for habits.",
    title: "Routine created",
    tone: "success",
  },
  deleted: {
    message: "Its habits are standalone, with schedules and history intact.",
    title: "Routine deleted",
    tone: "success",
  },
  "delete-error": {
    message: "Nothing changed. Try deleting the routine again.",
    title: "Routine not deleted",
    tone: "danger",
  },
  "habit-move-error": {
    message: "The previous habit order is still in place.",
    title: "Habit not reordered",
    tone: "danger",
  },
  "habit-moved": {
    message: "The routine's habit order is up to date.",
    title: "Habit order updated",
    tone: "success",
  },
  "membership-error": {
    message: "The habit remains where it was. Try moving it again.",
    title: "Habit not moved",
    tone: "danger",
  },
  "move-error": {
    message: "The previous routine order is still in place.",
    title: "Routine not reordered",
    tone: "danger",
  },
  moved: {
    message: "The routine order is up to date.",
    title: "Routine order updated",
    tone: "success",
  },
  renamed: {
    message: "The routine name is up to date.",
    title: "Routine renamed",
    tone: "success",
  },
  unassigned: {
    message: "The habit is now in the standalone list.",
    title: "Habit moved",
    tone: "success",
  },
};

export const metadata: Metadata = {
  title: route.label,
  description: route.description,
};

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{
    habit?: string | string[];
    routine?: string | string[];
  }>;
}) {
  const user = await requireCurrentUser();
  const [setup, query] = await Promise.all([
    getSetupViewModel(user.id),
    searchParams,
  ]);
  const routines = setup.sections.flatMap((section) =>
    section.kind === "routine"
      ? [
          {
            display_order: section.routine.displayOrder,
            icon: section.routine.icon,
            id: section.routine.id,
            name: section.routine.name,
          },
        ]
      : [],
  );
  const habitStatus = Array.isArray(query.habit) ? query.habit[0] : query.habit;
  const habitFeedbackTitle = habitStatus
    ? habitFeedbackTitles[habitStatus]
    : undefined;
  const routineStatus = Array.isArray(query.routine)
    ? query.routine[0]
    : query.routine;
  const currentRoutineFeedback = routineStatus
    ? routineFeedback[routineStatus]
    : undefined;

  return (
    <section aria-labelledby="page-title" className={styles.settings}>
      <div className={`${styles.setupHeading} page-heading`}>
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

      {currentRoutineFeedback ? (
        <Feedback
          title={currentRoutineFeedback.title}
          tone={currentRoutineFeedback.tone}
        >
          <p>{currentRoutineFeedback.message}</p>
        </Feedback>
      ) : null}

      <section
        aria-labelledby="habits-title"
        className={`${styles.habitsSection} ${styles.managementSection}`}
      >
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="habits-title">Habits</h2>
            <p>Create a clear identity and choose when each habit appears.</p>
          </div>
          <Link
            aria-label="Add a standalone habit"
            className={styles.plusControl}
            href="/setup/habits/new"
          >
            <span aria-hidden="true">+</span>
          </Link>
        </div>

        <HabitList
          moveRoutineAction={moveRoutine}
          moveRoutineHabitAction={moveRoutineHabit}
          moveStandaloneHabitAction={moveHabit}
          restoreAction={restoreHabit}
          routines={routines}
          sections={setup.sections}
        />
      </section>

      <section
        aria-labelledby="new-routine-title"
        className={`${styles.habitsSection} ${styles.routineCreation}`}
      >
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="new-routine-title">New routine</h2>
            <p>Name a container now; add zero, one, or many habits later.</p>
          </div>
        </div>
        <RoutineNameForm action={createRoutine} mode="create" />
      </section>

      <Link className={styles.advancedSettingsLink} href="/settings/time-zone">
        Advanced settings <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
