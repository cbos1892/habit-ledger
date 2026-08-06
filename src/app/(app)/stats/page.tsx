import type { Metadata } from "next";

import { RoutePlaceholder } from "../../../components/route-placeholder";
import { getNavigationItem } from "../../../lib/navigation";
import { requireConfiguredProfile } from "../../../lib/profile";

const route = getNavigationItem("stats");

export const metadata: Metadata = {
  title: route.label,
  description: route.description,
};

export default async function StatsPage() {
  await requireConfiguredProfile();

  return (
    <RoutePlaceholder
      eyebrow="Progress, gently"
      title="Stats"
      description={route.description}
      nextStep="Simple insights will highlight patterns without turning progress into pressure."
    />
  );
}
