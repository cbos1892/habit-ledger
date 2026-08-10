import type { Metadata } from "next";
import Link from "next/link";

import { Card, Feedback } from "../../../components/ui";
import { requireCurrentUser } from "../../../lib/auth/current-user";
import { getActiveHabits } from "../../../lib/habits";
import { getNavigationItem } from "../../../lib/navigation";
import { getProfile } from "../../../lib/profile";

import { TimeZoneForm } from "./time-zone-form";
import styles from "./time-zone.module.css";

const route = getNavigationItem("setup");

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
  const [profile, habits, query] = await Promise.all([
    getProfile(user.id),
    getActiveHabits(user.id),
    searchParams,
  ]);
  const isOnboarding = !profile.time_zone_confirmed_at;
  const habitStatus = Array.isArray(query.habit) ? query.habit[0] : query.habit;

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

      {habitStatus === "created" || habitStatus === "updated" ? (
        <Feedback
          title={habitStatus === "created" ? "Habit created" : "Habit updated"}
          tone="success"
        >
          <p>Your Setup list is up to date.</p>
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

        {habits.length > 0 ? (
          <ul className={styles.habitList}>
            {habits.map((habit) => (
              <li key={habit.id}>
                <Card className={styles.habitCard} padding="compact">
                  <span className={styles.habitIcon} aria-hidden="true">
                    {habit.icon}
                  </span>
                  <span className={styles.habitIdentity}>
                    <span className={styles.habitName}>{habit.name}</span>
                    <span className={styles.habitMeta}>
                      Starts {habit.start_date}
                    </span>
                  </span>
                  <span
                    aria-label={`${habit.color} color`}
                    className={styles.habitColor}
                    data-color={habit.color}
                    role="img"
                  />
                  <Link
                    className={styles.editLink}
                    href={`/setup/habits/${habit.id}/edit`}
                  >
                    Edit
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <Card className={styles.emptyHabits} padding="compact">
            <p>No habits yet. Create one small thing you want to return to.</p>
          </Card>
        )}
      </section>

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
