import { ISO_WEEKDAYS, isIsoWeekday, type IsoWeekday } from "./habit-schedule";

export const HABIT_COLORS = ["fern", "ocean", "sun", "plum", "rose"] as const;
export const HABIT_ICON_MAX_LENGTH = 64;

export type HabitColor = (typeof HABIT_COLORS)[number];

export type HabitFormValues = {
  name: string;
  icon: string;
  color: string;
  startDate: string;
  weekdays: IsoWeekday[];
};

export type HabitFormErrors = Partial<Record<keyof HabitFormValues, string>>;

export type ValidatedHabit = Omit<HabitFormValues, "color"> & {
  color: HabitColor;
};

export type HabitFormValidation =
  | { success: true; data: ValidatedHabit; values: HabitFormValues }
  | { success: false; errors: HabitFormErrors; values: HabitFormValues };

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isHabitColor(value: string): value is HabitColor {
  return HABIT_COLORS.some((color) => color === value);
}

function isLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return false;

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );

  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
  );
}

function countGraphemes(value: string) {
  return Array.from(
    new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value),
  ).length;
}

function readWeekdays(formData: FormData): {
  invalid: boolean;
  weekdays: IsoWeekday[];
} {
  const rawWeekdays = formData.getAll("weekdays");
  const parsed = rawWeekdays.map((value) =>
    typeof value === "string" ? Number(value) : Number.NaN,
  );
  const invalid = parsed.some((weekday) => !isIsoWeekday(weekday));
  const weekdays = ISO_WEEKDAYS.filter((weekday) => parsed.includes(weekday));

  return { invalid, weekdays };
}

export function validateHabitForm(formData: FormData): HabitFormValidation {
  const schedule = readWeekdays(formData);
  const values: HabitFormValues = {
    name: readText(formData, "name"),
    icon: readText(formData, "icon"),
    color: readText(formData, "color"),
    startDate: readText(formData, "startDate"),
    weekdays: schedule.weekdays,
  };
  const errors: HabitFormErrors = {};

  if (!values.name) {
    errors.name = "Enter a name for this habit.";
  } else if (Array.from(values.name).length > 100) {
    errors.name = "Keep the habit name to 100 characters or fewer.";
  }

  if (!values.icon) {
    errors.icon = "Add at least one emoji.";
  } else if (countGraphemes(values.icon) > 3) {
    errors.icon = "Use no more than 3 emojis.";
  } else if (values.icon.length > HABIT_ICON_MAX_LENGTH) {
    errors.icon = "Choose shorter emojis for this habit.";
  }

  if (!isHabitColor(values.color)) {
    errors.color = "Choose one of the available habit colors.";
  }

  if (!isLocalDate(values.startDate)) {
    errors.startDate = "Choose a valid start date.";
  }

  if (schedule.invalid || values.weekdays.length === 0) {
    errors.weekdays = "Choose at least one day of the week.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, values };
  }

  return {
    success: true,
    data: { ...values, color: values.color as HabitColor },
    values,
  };
}
