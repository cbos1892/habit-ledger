import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui";
import { getActiveHabit } from "@/lib/habits";
import { requireTimeZoneContext } from "@/lib/profile";

import { updateHabit } from "../../../habit-actions";
import { HabitForm } from "../../../habit-form";
import styles from "../../../time-zone.module.css";

export const metadata: Metadata = {
  title: "Edit habit",
  description: "Update a habit's identity and schedule.",
};

export default async function EditHabitPage({
  params,
}: {
  params: Promise<{ habitId: string }>;
}) {
  const [{ habitId }, profile] = await Promise.all([
    params,
    requireTimeZoneContext(),
  ]);
  const habit = await getActiveHabit(profile.id, habitId);

  if (!habit) notFound();

  return (
    <section aria-labelledby="page-title" className={styles.settings}>
      <div className="page-heading">
        <p className="page-eyebrow">Keep it useful</p>
        <h1 className="page-title" id="page-title">
          Edit habit
        </h1>
        <p className="page-description">
          Adjust how this habit appears without losing its history.
        </p>
      </div>
      <Card className={styles.card}>
        <HabitForm
          action={updateHabit.bind(null, habit.id)}
          initialValues={{
            name: habit.name,
            icon: habit.icon,
            color: habit.color,
            startDate: habit.start_date,
            weekdays: habit.weekdays,
          }}
          mode="edit"
        />
      </Card>
    </section>
  );
}
