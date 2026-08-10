import type { Metadata } from "next";

import { RoutePlaceholder } from "../../../components/route-placeholder";
import { getNavigationItem } from "../../../lib/navigation";
import { requireConfiguredProfile } from "../../../lib/profile";
import { getTodayViewModel } from "../../../lib/today";

const route = getNavigationItem("today");

export const metadata: Metadata = {
  title: route.label,
  description: route.description,
};

export default async function TodayPage() {
  const profile = await requireConfiguredProfile();
  const today = await getTodayViewModel(profile.id, profile.time_zone);

  return (
    <RoutePlaceholder
      eyebrow="Daily check-in"
      title="Today"
      description={route.description}
      nextStep={
        today.status === "empty"
          ? "No habits are scheduled for today."
          : `${today.totalCount} scheduled ${today.totalCount === 1 ? "habit is" : "habits are"} ready for check-in.`
      }
    />
  );
}
