export const DEFAULT_TIME_ZONE = "UTC";

export function isSupportedTimeZone(value: string): boolean {
  if (!value || value.length > 100) return false;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function getBrowserTimeZone(): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return isSupportedTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
}

export function toLocalDateKey(
  instant: Date | number | string,
  timeZone: string,
): string {
  if (!isSupportedTimeZone(timeZone)) {
    throw new RangeError(`Unsupported time zone: ${timeZone}`);
  }

  const date = instant instanceof Date ? instant : new Date(instant);

  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Invalid date");
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function addLocalDateDays(localDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);

  if (!match) throw new RangeError("Invalid local date");

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );

  if (toLocalDateKey(date, "UTC") !== localDate) {
    throw new RangeError("Invalid local date");
  }

  date.setUTCDate(date.getUTCDate() + days);
  return toLocalDateKey(date, "UTC");
}

export function getLocalWeekDateKeys(
  instant: Date | number | string,
  timeZone: string,
  weekStartsOn: 0 | 1 = 1,
): readonly string[] {
  const localDate = toLocalDateKey(instant, timeZone);
  const dayOfWeek = new Date(`${localDate}T00:00:00.000Z`).getUTCDay();
  const daysFromStart = (dayOfWeek - weekStartsOn + 7) % 7;
  const start = addLocalDateDays(localDate, -daysFromStart);

  return Object.freeze(
    Array.from({ length: 7 }, (_, index) => addLocalDateDays(start, index)),
  );
}
