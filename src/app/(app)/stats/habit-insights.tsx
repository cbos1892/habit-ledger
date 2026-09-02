import type { HabitCompletionStatistic } from "../../../lib/stats";

import styles from "./habit-insights.module.css";

export type HabitInsightsProps = Readonly<{
  habits: readonly HabitCompletionStatistic[];
}>;

const MAX_SUPPORT_HABITS = 2;
const MAX_INITIAL_STRONGEST_HABITS = 3;

function compareRate(
  left: HabitCompletionStatistic,
  right: HabitCompletionStatistic,
) {
  return (
    left.completedCount * right.opportunityCount -
    right.completedCount * left.opportunityCount
  );
}

/**
 * Rank from strongest to gentlest opportunity without relying on the rounded
 * display percentage. Saved order makes an otherwise equal result feel stable.
 */
export function rankHabitInsights(habits: readonly HabitCompletionStatistic[]) {
  return habits
    .filter(
      ({ completedCount, opportunityCount }) =>
        opportunityCount > 0 &&
        completedCount >= 0 &&
        completedCount <= opportunityCount,
    )
    .toSorted((left, right) => {
      const rateComparison = compareRate(left, right);
      if (rateComparison !== 0) return -rateComparison;

      const opportunityComparison =
        right.opportunityCount - left.opportunityCount;
      if (opportunityComparison !== 0) return opportunityComparison;

      const orderComparison = left.displayOrder - right.displayOrder;
      if (orderComparison !== 0) return orderComparison;

      return left.id.localeCompare(right.id);
    });
}

function hasSameRate(
  left: HabitCompletionStatistic,
  right: HabitCompletionStatistic,
) {
  return compareRate(left, right) === 0;
}

function splitHabitInsights(habits: readonly HabitCompletionStatistic[]) {
  const ranked = rankHabitInsights(habits);

  if (ranked.length <= 1) {
    return { strongest: ranked, support: [] } as const;
  }

  const initialStrongestCount = Math.min(
    MAX_INITIAL_STRONGEST_HABITS,
    Math.ceil(ranked.length / 2),
  );
  let strongestCount = initialStrongestCount;

  // Keep equal rates together instead of framing one tied habit as stronger.
  while (
    strongestCount < ranked.length &&
    hasSameRate(ranked[strongestCount - 1], ranked[strongestCount])
  ) {
    strongestCount += 1;
  }

  const strongest = ranked.slice(0, strongestCount);
  const support = ranked
    .slice(strongestCount)
    .toSorted((left, right) => {
      const rateComparison = compareRate(left, right);
      if (rateComparison !== 0) return rateComparison;

      const opportunityComparison =
        right.opportunityCount - left.opportunityCount;
      if (opportunityComparison !== 0) return opportunityComparison;

      const orderComparison = left.displayOrder - right.displayOrder;
      if (orderComparison !== 0) return orderComparison;

      return left.id.localeCompare(right.id);
    })
    .slice(0, MAX_SUPPORT_HABITS);

  return { strongest, support } as const;
}

function completionPercentage(habit: HabitCompletionStatistic) {
  return Math.round((habit.completedCount / habit.opportunityCount) * 100);
}

function HabitInsightCard({
  habit,
  strongest,
}: {
  habit: HabitCompletionStatistic;
  strongest: boolean;
}) {
  const percentage = completionPercentage(habit);
  const showContinuity =
    strongest &&
    habit.hasPositiveContinuity &&
    habit.opportunityCount > 0 &&
    habit.completedCount === habit.opportunityCount;

  return (
    <li
      className={styles.habitCard}
      data-color={habit.color}
      data-habit-id={habit.id}
    >
      <div className={styles.identity}>
        <span className={styles.icon} aria-hidden="true">
          {habit.icon}
        </span>
        <div className={styles.nameBlock}>
          <h4 className={styles.habitName}>{habit.name}</h4>
          {showContinuity ? (
            <span className={styles.continuityBadge}>Two weeks strong</span>
          ) : null}
        </div>
      </div>

      <div className={styles.rate}>
        <span className={styles.percentage}>{percentage}%</span>
        <span className={styles.counts}>
          {habit.completedCount} of {habit.opportunityCount} scheduled
          opportunities
        </span>
      </div>
    </li>
  );
}

export function HabitInsights({ habits }: HabitInsightsProps) {
  const { strongest, support } = splitHabitInsights(habits);

  if (strongest.length === 0) return null;

  return (
    <section
      className={styles.insights}
      aria-labelledby="habit-insights-title"
      data-testid="habit-insights"
    >
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Habit insights</p>
        <h2 className={styles.title} id="habit-insights-title">
          The rhythms taking shape
        </h2>
        <p className={styles.introduction}>
          A habit-by-habit view of your scheduled opportunities over the past 14
          days.
        </p>
      </header>

      <div className={styles.groups}>
        <section
          className={styles.group}
          aria-labelledby="strongest-habits-title"
        >
          <div className={styles.groupHeading}>
            <h3 id="strongest-habits-title">Strongest right now</h3>
            <p>The habits you have returned to most often.</p>
          </div>
          <ol className={styles.habitList} data-testid="strongest-habits">
            {strongest.map((habit) => (
              <HabitInsightCard habit={habit} key={habit.id} strongest />
            ))}
          </ol>
        </section>

        {support.length > 0 ? (
          <section
            className={styles.group}
            aria-labelledby="support-habits-title"
          >
            <div className={styles.groupHeading}>
              <h3 id="support-habits-title">A gentle place to focus</h3>
              <p>
                A little extra attention here may help these habits feel easier
                to return to.
              </p>
            </div>
            <ul className={styles.habitList} data-testid="support-habits">
              {support.map((habit) => (
                <HabitInsightCard
                  habit={habit}
                  key={habit.id}
                  strongest={false}
                />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </section>
  );
}
