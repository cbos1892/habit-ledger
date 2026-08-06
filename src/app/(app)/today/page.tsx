import type { Metadata } from "next";

import { RoutePlaceholder } from "../../../components/route-placeholder";
import { getNavigationItem } from "../../../lib/navigation";
import { requireConfiguredProfile } from "../../../lib/profile";

const route = getNavigationItem("today");

export const metadata: Metadata = {
  title: route.label,
  description: route.description,
};

export default async function TodayPage() {
  await requireConfiguredProfile();

  return (
    <RoutePlaceholder
      eyebrow="Daily check-in"
      title="Today"
      description={route.description}
      nextStep="Your scheduled habits will gather here for a quick, calm check-in."
    />
  );
}
