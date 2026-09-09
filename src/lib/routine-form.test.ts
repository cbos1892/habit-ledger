import { describe, expect, it } from "vitest";

import { validateRoutineForm } from "./routine-form";

function routineFormData(name: string) {
  const data = new FormData();
  data.set("name", name);
  return data;
}

describe("validateRoutineForm", () => {
  it("trims and accepts a routine name", () => {
    expect(validateRoutineForm(routineFormData("  Morning reset  "))).toEqual({
      success: true,
      data: { name: "Morning reset" },
      values: { name: "Morning reset" },
    });
  });

  it("requires a name of at most 100 characters", () => {
    expect(validateRoutineForm(routineFormData("   "))).toMatchObject({
      success: false,
      errors: { name: expect.any(String) },
    });
    expect(validateRoutineForm(routineFormData("r".repeat(101)))).toMatchObject(
      {
        success: false,
        errors: { name: expect.any(String) },
      },
    );
  });
});
