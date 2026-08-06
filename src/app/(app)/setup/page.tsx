import type { Metadata } from "next";

import { RoutePlaceholder } from "../../../components/route-placeholder";
import { getNavigationItem } from "../../../lib/navigation";

const route = getNavigationItem("setup");

export const metadata: Metadata = {
  title: route.label,
  description: route.description,
};

export default function SetupPage() {
  return (
    <RoutePlaceholder
      eyebrow="Make it yours"
      title="Setup"
      description={route.description}
      nextStep="Habit schedules, colors, icons, and preferences will live here."
    />
  );
}
