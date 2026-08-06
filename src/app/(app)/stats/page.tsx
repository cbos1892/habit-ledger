import type { Metadata } from "next";

import { RoutePlaceholder } from "../../../components/route-placeholder";
import { getNavigationItem } from "../../../lib/navigation";

const route = getNavigationItem("stats");

export const metadata: Metadata = {
  title: route.label,
  description: route.description,
};

export default function StatsPage() {
  return (
    <RoutePlaceholder
      eyebrow="Progress, gently"
      title="Stats"
      description={route.description}
      nextStep="Simple insights will highlight patterns without turning progress into pressure."
    />
  );
}
