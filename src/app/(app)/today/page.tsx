import type { Metadata } from "next";

import { getNavigationItem } from "../../../lib/navigation";
import { getCurrentTimeZoneContext } from "../../../lib/profile";
import { getTodayViewModel } from "../../../lib/today";
import { TodayView } from "./today-view";

const route = getNavigationItem("today");

export const metadata: Metadata = {
  title: route.label,
  description: route.description,
};

export default async function TodayPage() {
  const context = await getCurrentTimeZoneContext();
  const today = await getTodayViewModel(context.id, context.time_zone);

  return <TodayView today={today} />;
}
