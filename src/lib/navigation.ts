export const primaryNavigation = [
  {
    segment: "today",
    href: "/today",
    label: "Today",
    icon: "today",
    description: "Check in with the habits scheduled for today.",
  },
  {
    segment: "week",
    href: "/week",
    label: "Week",
    icon: "week",
    description: "Review and edit a clear seven-day habit grid.",
  },
  {
    segment: "stats",
    href: "/stats",
    label: "Stats",
    icon: "stats",
    description: "Notice helpful patterns in your progress over time.",
  },
  {
    segment: "setup",
    href: "/setup",
    label: "Setup",
    icon: "setup",
    description: "Create habits and adjust how Habit Ledger works for you.",
  },
] as const;

export type NavigationSegment = (typeof primaryNavigation)[number]["segment"];
export type NavigationIcon = (typeof primaryNavigation)[number]["icon"];

export function getNavigationItem(segment: NavigationSegment) {
  return primaryNavigation.find((item) => item.segment === segment)!;
}
