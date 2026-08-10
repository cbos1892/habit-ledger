import { toLocalDateKey } from "./time-zone";

export const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export type IsoWeekday = (typeof ISO_WEEKDAYS)[number];

export type HabitSchedule = {
  startDate: string;
  weekdays: readonly IsoWeekday[];
};

export function isIsoWeekday(value: number): value is IsoWeekday {
  return Number.isInteger(value) && value >= 1 && value <= 7;
}

export function getIsoWeekday(localDate: string): IsoWeekday {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);

  if (!match) throw new RangeError("Invalid local date");

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );

  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    throw new RangeError("Invalid local date");
  }

  return (((date.getUTCDay() + 6) % 7) + 1) as IsoWeekday;
}

export function isHabitScheduledAt(
  schedule: HabitSchedule,
  instant: Date | number | string,
  timeZone: string,
): boolean {
  const localDate = toLocalDateKey(instant, timeZone);

  return (
    localDate >= schedule.startDate &&
    schedule.weekdays.includes(getIsoWeekday(localDate))
  );
}
