import type { Metadata } from "next";

import { Card } from "@/components/ui";
import { getRoutines } from "@/lib/habits";
import { requireTimeZoneContext } from "@/lib/profile";
import { ISO_WEEKDAYS } from "@/lib/habit-schedule";
import { toLocalDateKey } from "@/lib/time-zone";

import { createHabit } from "../../habit-actions";
import { HabitForm } from "../../habit-form";
import styles from "../../time-zone.module.css";

export const metadata: Metadata = {
  title: "New habit",
  description: "Create a visually distinctive binary habit.",
};

export default async function NewHabitPage({
  searchParams,
}: {
  searchParams: Promise<{ routineId?: string | string[] }>;
}) {
  const profile = await requireTimeZoneContext();
  const [routines, query] = await Promise.all([
    getRoutines(profile.id),
    searchParams,
  ]);
  const requestedRoutineId = Array.isArray(query.routineId)
    ? query.routineId[0]
    : query.routineId;
  const routineId = routines.some(({ id }) => id === requestedRoutineId)
    ? (requestedRoutineId ?? "")
    : "";

  return (
    <section aria-labelledby="page-title" className={styles.settings}>
      <div className="page-heading">
        <p className="page-eyebrow">A fresh start</p>
        <h1 className="page-title" id="page-title">
          New habit
        </h1>
        <p className="page-description">
          Give this habit a simple identity and choose when it should appear.
        </p>
      </div>
      <Card className={styles.card}>
        <HabitForm
          action={createHabit}
          initialValues={{
            name: "",
            icon: "",
            color: "fern",
            routineId,
            startDate: toLocalDateKey(new Date(), profile.time_zone),
            weekdays: [...ISO_WEEKDAYS],
          }}
          mode="create"
          routines={routines}
        />
      </Card>
    </section>
  );
}
