import type { Metadata } from "next";

import { getNavigationItem } from "../../../lib/navigation";
import { getCurrentProfile } from "../../../lib/profile";
import { getStatisticsViewModel } from "../../../lib/stats";
import { StatsView } from "./stats-view";

const route = getNavigationItem("stats");

export const metadata: Metadata = {
  title: route.label,
  description: route.description,
};

export default async function StatsPage() {
  const profile = await getCurrentProfile();
  const statistics = await getStatisticsViewModel(
    profile.id,
    profile.time_zone,
    { weekStartsOn: profile.week_starts_on },
  );

  return <StatsView statistics={statistics} />;
}
