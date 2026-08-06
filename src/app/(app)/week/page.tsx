import type { Metadata } from "next";

import { RoutePlaceholder } from "../../../components/route-placeholder";
import { getNavigationItem } from "../../../lib/navigation";

const route = getNavigationItem("week");

export const metadata: Metadata = {
  title: route.label,
  description: route.description,
};

export default function WeekPage() {
  return (
    <RoutePlaceholder
      eyebrow="Seven-day view"
      title="Week"
      description={route.description}
      nextStep="A flexible weekly grid will make progress easy to see and adjust."
    />
  );
}
