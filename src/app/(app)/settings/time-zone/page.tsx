import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui";
import { getCurrentProfile } from "@/lib/profile";

import { TimeZoneForm } from "../../setup/time-zone-form";
import { WeekStartForm } from "./week-start-form";
import styles from "../../setup/time-zone.module.css";

export const metadata: Metadata = {
  title: "Advanced settings",
  description: "Choose how Habit Ledger handles local calendar dates.",
};

export default async function TimeZoneSettingsPage() {
  const profile = await getCurrentProfile();

  return (
    <section aria-labelledby="page-title" className={styles.settings}>
      <div className="page-heading">
        <p className="page-eyebrow">Make the calendar yours</p>
        <h1 className="page-title" id="page-title">
          Advanced settings
        </h1>
        <p className="page-description">
          Choose how your calendar is grouped and correct its time zone when
          automatic detection does not match your intended local day.
        </p>
      </div>

      <Card className={styles.card}>
        <div className={styles.cardHeading}>
          <h2>Week layout</h2>
          <p>
            This changes the Week grid and previous or next week boundaries.
            Completion history stays on its recorded dates.
          </p>
        </div>
        <WeekStartForm initialWeekStartsOn={profile.week_starts_on} />
      </Card>

      <Card className={styles.card}>
        <div className={styles.cardHeading}>
          <h2>Time zone</h2>
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
