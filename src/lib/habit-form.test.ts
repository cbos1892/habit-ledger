import { describe, expect, it } from "vitest";

import { validateHabitForm } from "./habit-form";

function habitFormData(
  values: Partial<Record<"name" | "icon" | "color" | "startDate", string>> = {},
) {
  const data = new FormData();
  data.set("name", values.name ?? "Morning walk");
  data.set("icon", values.icon ?? "🌿");
  data.set("color", values.color ?? "fern");
  data.set("startDate", values.startDate ?? "2026-08-10");
  return data;
}

describe("habit form validation", () => {
  it("normalizes valid values", () => {
    const result = validateHabitForm(
      habitFormData({ name: "  Morning walk  ", icon: " 🌿 " }),
    );

    expect(result).toEqual({
      success: true,
      data: {
        name: "Morning walk",
        icon: "🌿",
        color: "fern",
        startDate: "2026-08-10",
      },
      values: {
        name: "Morning walk",
        icon: "🌿",
        color: "fern",
        startDate: "2026-08-10",
      },
    });
  });

  it("returns a field error for every invalid value", () => {
    const result = validateHabitForm(
      habitFormData({
        name: "",
        icon: "",
        color: "chartreuse",
        startDate: "2026-02-30",
      }),
    );

    expect(result).toMatchObject({
      success: false,
      errors: {
        name: expect.any(String),
        icon: expect.any(String),
        color: expect.any(String),
        startDate: expect.any(String),
      },
      values: {
        name: "",
        icon: "",
        color: "chartreuse",
        startDate: "2026-02-30",
      },
    });
  });

  it("counts emoji by code point for the database limit", () => {
    const result = validateHabitForm(habitFormData({ icon: "🌿".repeat(17) }));

    expect(result).toMatchObject({
      success: false,
      errors: { icon: expect.stringContaining("16") },
    });
  });
});
