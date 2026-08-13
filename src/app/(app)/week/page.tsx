import type { Metadata } from "next";

import { getNavigationItem } from "../../../lib/navigation";
import { getCurrentProfile } from "../../../lib/profile";
import { getWeeklyViewModel } from "../../../lib/week";
import { WeekView } from "./week-view";

const route = getNavigationItem("week");

export const metadata: Metadata = {
  title: route.label,
  description: route.description,
};

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[] }>;
}) {
  const requestedWeek = (await searchParams).week;
  const profile = await getCurrentProfile();
  const week = await getWeeklyViewModel(profile.id, profile.time_zone, {
    selectedWeekStart:
      typeof requestedWeek === "string" ? requestedWeek : undefined,
    weekStartsOn: profile.week_starts_on,
  });

  return <WeekView week={week} />;
}
