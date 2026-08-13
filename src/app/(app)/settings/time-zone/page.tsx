import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui";
import { getCurrentProfile } from "@/lib/profile";

import { TimeZoneForm } from "../../setup/time-zone-form";
import styles from "../../setup/time-zone.module.css";

export const metadata: Metadata = {
  title: "Time zone",
  description: "Manually correct the time zone used for local calendar days.",
};

export default async function TimeZoneSettingsPage() {
  const profile = await getCurrentProfile();

  return (
    <section aria-labelledby="page-title" className={styles.settings}>
      <div className="page-heading">
        <p className="page-eyebrow">Advanced setting</p>
        <h1 className="page-title" id="page-title">
          Time zone
        </h1>
        <p className="page-description">
          Habit Ledger normally detects this automatically. Change it only if
          Today does not match your intended local calendar.
        </p>
      </div>

      <Card className={styles.card}>
        <div className={styles.cardHeading}>
          <h2>Manual correction</h2>
          <p>
            A manual choice is preserved when this browser later reports a
            different zone.
          </p>
        </div>
        <TimeZoneForm initialTimeZone={profile.time_zone} />
      </Card>

      <div className={styles.note}>
        <p>
          Existing completions remain attached to their recorded local dates.
          This setting affects future date calculations only.
        </p>
      </div>

      <Link href="/setup">Back to Setup</Link>
    </section>
  );
}
