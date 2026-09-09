export const ROUTINE_NAME_MAX_LENGTH = 100;

export type RoutineFormValues = {
  name: string;
};

export type RoutineFormErrors = Partial<
  Record<keyof RoutineFormValues, string>
>;

export type RoutineFormValidation =
  | { success: true; data: RoutineFormValues; values: RoutineFormValues }
  | {
      success: false;
      errors: RoutineFormErrors;
      values: RoutineFormValues;
    };

export function validateRoutineForm(formData: FormData): RoutineFormValidation {
  const rawName = formData.get("name");
  const values = {
    name: typeof rawName === "string" ? rawName.trim() : "",
  };
  const errors: RoutineFormErrors = {};

  if (!values.name) {
    errors.name = "Enter a name for this routine.";
  } else if (Array.from(values.name).length > ROUTINE_NAME_MAX_LENGTH) {
    errors.name = "Keep the routine name to 100 characters or fewer.";
  }

  return Object.keys(errors).length > 0
    ? { success: false, errors, values }
    : { success: true, data: values, values };
}
