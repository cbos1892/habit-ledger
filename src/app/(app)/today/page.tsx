import type { Metadata } from "next";

import { RoutePlaceholder } from "../../../components/route-placeholder";
import { getNavigationItem } from "../../../lib/navigation";

const route = getNavigationItem("today");

export const metadata: Metadata = {
  title: route.label,
  description: route.description,
};

export default function TodayPage() {
  return (
    <RoutePlaceholder
      eyebrow="Daily check-in"
      title="Today"
      description={route.description}
      nextStep="Your scheduled habits will gather here for a quick, calm check-in."
    />
  );
}
