import type { Metadata } from "next";

import { Card } from "../../../components/ui";
import { requireCurrentUser } from "../../../lib/auth/current-user";
import { getNavigationItem } from "../../../lib/navigation";
import { getProfile } from "../../../lib/profile";

import { TimeZoneForm } from "./time-zone-form";
import styles from "./time-zone.module.css";

const route = getNavigationItem("setup");

export const metadata: Metadata = {
  title: route.label,
  description: route.description,
};

export default async function SetupPage() {
  const user = await requireCurrentUser();
  const profile = await getProfile(user.id);
  const isOnboarding = !profile.time_zone_confirmed_at;

  return (
    <section aria-labelledby="page-title" className={styles.settings}>
      <div className="page-heading">
        <p className="page-eyebrow">
          {isOnboarding ? "One quick first step" : "Make it yours"}
        </p>
        <h1 className="page-title" id="page-title">
          {isOnboarding ? "Welcome" : "Setup"}
        </h1>
        <p className="page-description">
          {isOnboarding
            ? "Confirm where your day begins so Today and Week always line up with your local calendar."
            : route.description}
        </p>
      </div>

      <Card className={styles.card}>
        <div className={styles.cardHeading}>
          <h2>{isOnboarding ? "Confirm your time zone" : "Time zone"}</h2>
          <p>
            Habit Ledger uses this setting for day and week boundaries, even
            when the server is somewhere else.
          </p>
        </div>
        <TimeZoneForm
          initialTimeZone={profile.time_zone}
          isOnboarding={isOnboarding}
        />
      </Card>

      <div className={styles.note}>
        <p>
          Changing this later affects future date calculations only. Completed
          habits remain attached to the local calendar dates on which you
          recorded them.
        </p>
      </div>
    </section>
  );
}
