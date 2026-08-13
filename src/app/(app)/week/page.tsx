import type { Metadata } from "next";

import { getNavigationItem } from "../../../lib/navigation";
import { getCurrentTimeZoneContext } from "../../../lib/profile";
import { getWeeklyViewModel } from "../../../lib/week";
import { WeekView } from "./week-view";

const route = getNavigationItem("week");

export const metadata: Metadata = {
  title: route.label,
  description: route.description,
};

export default async function WeekPage() {
  const context = await getCurrentTimeZoneContext();
  const week = await getWeeklyViewModel(context.id, context.time_zone);

  return <WeekView week={week} />;
}
