"use server";

import { setHabitCompletion as setSharedHabitCompletion } from "../today/completion-actions";

export async function setHabitCompletion(
  habitId: string,
  completed: boolean,
  localDate: string,
) {
  return setSharedHabitCompletion(habitId, completed, localDate);
}
