import type { Metadata } from "next";

import { Card } from "@/components/ui";
import { requireConfiguredProfile } from "@/lib/profile";
import { ISO_WEEKDAYS } from "@/lib/habit-schedule";
import { toLocalDateKey } from "@/lib/time-zone";

import { createHabit } from "../../habit-actions";
import { HabitForm } from "../../habit-form";
import styles from "../../time-zone.module.css";

export const metadata: Metadata = {
  title: "New habit",
  description: "Create a visually distinctive binary habit.",
};

export default async function NewHabitPage() {
  const profile = await requireConfiguredProfile();

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
            startDate: toLocalDateKey(new Date(), profile.time_zone),
            weekdays: [...ISO_WEEKDAYS],
          }}
          mode="create"
        />
      </Card>
    </section>
  );
}
