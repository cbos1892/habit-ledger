import "server-only";

import {
  isHabitScheduledOnDate,
  isIsoWeekday,
  type IsoWeekday,
} from "@/lib/habit-schedule";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  addLocalDateDays,
  getLocalWeekStartDate,
  toLocalDateKey,
  type WeekStartsOn,
} from "@/lib/time-zone";
import type { Tables } from "@/types/database";

const SUMMARY_DAY_COUNT = 14;
const TREND_WEEK_COUNT = 8;
const DAYS_PER_WEEK = 7;

type StatisticHabitIdentity = Pick<
  Tables<"habits">,
  "id" | "name" | "icon" | "color"
>;

export type CompletionRate = Readonly<{
  completedCount: number;
  opportunityCount: number;
  percentage: number | null;
}>;

export type StatisticsSummary = Readonly<
  CompletionRate & {
    endDate: string;
    startDate: string;
  }
>;

export type WeeklyCompletionPoint = Readonly<
  CompletionRate & {
    endDate: string;
    isCurrentWeek: boolean;
    isPartial: boolean;
    startDate: string;
  }
>;

export type HabitCompletionStatistic = Readonly<
  StatisticHabitIdentity &
    CompletionRate & {
      displayOrder: number;
      hasPositiveContinuity: boolean;
    }
>;

export type StatisticsViewStatus = "no-habits" | "no-opportunities" | "ready";

export type StatisticsViewModel = Readonly<{
  currentLocalDate: string;
  habits: readonly HabitCompletionStatistic[];
  overall: StatisticsSummary;
  status: StatisticsViewStatus;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
  weekly: readonly WeeklyCompletionPoint[];
}>;

export type StatisticsViewOptions = Readonly<{
  instant?: Date | number | string;
  weekStartsOn?: WeekStartsOn;
}>;

const statisticHabitSelection =
  "id, name, icon, color, start_date, archived_at, display_order, habit_schedules(weekday), completions(local_date)" as const;

type StatisticHabitRecord = Pick<
  Tables<"habits">,
  | "id"
  | "name"
  | "icon"
  | "color"
  | "start_date"
  | "archived_at"
  | "display_order"
> & {
  completions: Pick<Tables<"completions">, "local_date">[];
  habit_schedules: { weekday: number }[];
};

type IndexedHabit = Readonly<{
  archivedLocalDate: string | null;
  completions: ReadonlySet<string>;
  record: StatisticHabitRecord;
  weekdays: readonly IsoWeekday[];
}>;

function getDateRange(startDate: string, endDate: string): readonly string[] {
  const dates: string[] = [];

  for (
    let date = startDate;
    date <= endDate;
    date = addLocalDateDays(date, 1)
  ) {
    dates.push(date);
  }

  return Object.freeze(dates);
}

function indexHabit(
  habit: StatisticHabitRecord,
  timeZone: string,
): IndexedHabit {
  return Object.freeze({
    archivedLocalDate: habit.archived_at
      ? toLocalDateKey(habit.archived_at, timeZone)
      : null,
    completions: new Set(habit.completions.map(({ local_date }) => local_date)),
    record: habit,
    weekdays: Object.freeze(
      habit.habit_schedules
        .map(({ weekday }) => weekday)
        .filter(isIsoWeekday)
        .sort((a, b) => a - b),
    ),
  });
}

function isOpportunity(habit: IndexedHabit, localDate: string): boolean {
  if (habit.archivedLocalDate !== null && localDate > habit.archivedLocalDate) {
    return false;
  }

  // Schedules do not have history in R2. The current saved weekdays are
  // intentionally applied to the entire statistics window. Consequently, a
  // completion on a weekday removed from the current schedule is ignored.
  return isHabitScheduledOnDate(
    {
      startDate: habit.record.start_date,
      weekdays: habit.weekdays,
    },
    localDate,
  );
}

function calculateRate(
  habits: readonly IndexedHabit[],
  localDates: readonly string[],
): CompletionRate {
  let completedCount = 0;
  let opportunityCount = 0;

  for (const habit of habits) {
    for (const localDate of localDates) {
      if (!isOpportunity(habit, localDate)) continue;

      opportunityCount += 1;
      if (habit.completions.has(localDate)) completedCount += 1;
    }
  }

  return Object.freeze({
    completedCount,
    opportunityCount,
    percentage:
      opportunityCount === 0
        ? null
        : Math.round((completedCount / opportunityCount) * 100),
  });
}

function createHabitStatistic(
  habit: IndexedHabit,
  localDates: readonly string[],
): HabitCompletionStatistic {
  const rate = calculateRate([habit], localDates);

  return Object.freeze({
    id: habit.record.id,
    name: habit.record.name,
    icon: habit.record.icon,
    color: habit.record.color,
    displayOrder: habit.record.display_order,
    ...rate,
    hasPositiveContinuity:
      rate.opportunityCount > 0 &&
      rate.completedCount === rate.opportunityCount,
  });
}

export async function getStatisticsViewModel(
  ownerId: string,
  timeZone: string,
  options: StatisticsViewOptions = {},
): Promise<StatisticsViewModel> {
  const { instant = new Date(), weekStartsOn = 1 } = options;
  const currentLocalDate = toLocalDateKey(instant, timeZone);
  const currentWeekStart = getLocalWeekStartDate(
    currentLocalDate,
    weekStartsOn,
  );
  const trendStartDate = addLocalDateDays(
    currentWeekStart,
    -(TREND_WEEK_COUNT - 1) * DAYS_PER_WEEK,
  );
  const summaryStartDate = addLocalDateDays(
    currentLocalDate,
    -(SUMMARY_DAY_COUNT - 1),
  );
  const summaryDates = getDateRange(summaryStartDate, currentLocalDate);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("habits")
    .select(statisticHabitSelection)
    .eq("owner_id", ownerId)
    .gte("completions.local_date", trendStartDate)
    .lte("completions.local_date", currentLocalDate)
    .order("display_order")
    .order("id");

  if (error) throw new Error("Unable to load statistics.");

  const indexedHabits = Object.freeze(
    ((data ?? []) as StatisticHabitRecord[]).map((habit) =>
      indexHabit(habit, timeZone),
    ),
  );
  const currentHabits = indexedHabits.filter(
    ({ record }) => record.archived_at === null,
  );
  const overallRate = calculateRate(indexedHabits, summaryDates);
  const overall = Object.freeze({
    ...overallRate,
    endDate: currentLocalDate,
    startDate: summaryStartDate,
  });
  const habits = Object.freeze(
    currentHabits.map((habit) => createHabitStatistic(habit, summaryDates)),
  );
  const weekly = Object.freeze(
    Array.from({ length: TREND_WEEK_COUNT }, (_, index) => {
      const startDate = addLocalDateDays(trendStartDate, index * DAYS_PER_WEEK);
      const endDate = addLocalDateDays(startDate, DAYS_PER_WEEK - 1);
      const isCurrentWeek = startDate === currentWeekStart;
      const calculationEndDate = isCurrentWeek ? currentLocalDate : endDate;
      const rate = calculateRate(
        indexedHabits,
        getDateRange(startDate, calculationEndDate),
      );

      return Object.freeze({
        ...rate,
        endDate,
        isCurrentWeek,
        // Even on its final local date, the current week remains in progress
        // until the user's calendar advances into the next week.
        isPartial: isCurrentWeek,
        startDate,
      });
    }),
  );
  const status: StatisticsViewStatus =
    overall.opportunityCount > 0
      ? "ready"
      : habits.length === 0
        ? "no-habits"
        : "no-opportunities";

  return Object.freeze({
    currentLocalDate,
    habits,
    overall,
    status,
    timeZone,
    weekStartsOn,
    weekly,
  });
}
