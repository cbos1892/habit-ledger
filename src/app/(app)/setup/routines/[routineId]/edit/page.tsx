import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getRoutine } from "@/lib/habits";

import { deleteRoutine, renameRoutine } from "../../../habit-actions";
import { RoutineEditForm } from "../../../routine-edit-form";
import styles from "../../../time-zone.module.css";

export const metadata: Metadata = {
  title: "Edit routine",
  description: "Update a routine or remove it without affecting its habits.",
};

export default async function EditRoutinePage({
  params,
}: {
  params: Promise<{ routineId: string }>;
}) {
  const [{ routineId }, user] = await Promise.all([
    params,
    requireCurrentUser(),
  ]);
  const routine = await getRoutine(user.id, routineId);
  if (!routine) notFound();
  return (
    <section aria-labelledby="page-title" className={styles.settings}>
      <div className="page-heading">
        <p className="page-eyebrow">Keep it organized</p>
        <h1 className="page-title" id="page-title">
          Edit routine
        </h1>
        <p className="page-description">
          Change its name or remove the container without losing any habit
          history.
        </p>
      </div>
      <Card className={styles.card}>
        <RoutineEditForm
          deleteAction={deleteRoutine}
          initialIcon={routine.icon ?? "◌"}
          initialName={routine.name}
          renameAction={renameRoutine.bind(null, routine.id)}
          routineId={routine.id}
        />
      </Card>
    </section>
  );
}
