import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HabitForm } from "./habit-form";

const action = vi.fn(async () => ({ status: "idle" }) as const);

describe("HabitForm", () => {
  it("renders reusable labeled create fields with useful defaults", () => {
    render(
      <HabitForm
        action={action}
        initialValues={{
          name: "",
          icon: "",
          color: "fern",
          startDate: "2026-08-10",
        }}
        mode="create"
      />,
    );

    expect(screen.getByLabelText("Icon or emoji")).toBeRequired();
    expect(screen.getByLabelText("Habit name")).toBeRequired();
    expect(screen.getByRole("radio", { name: /Fern/ })).toBeChecked();
    expect(screen.getByLabelText("Start date")).toHaveValue("2026-08-10");
    expect(
      screen.getByRole("button", { name: "Create habit" }),
    ).toBeInTheDocument();
  });

  it("uses the same fields and existing values in edit mode", () => {
    render(
      <HabitForm
        action={action}
        initialValues={{
          name: "Read",
          icon: "📚",
          color: "plum",
          startDate: "2026-07-01",
        }}
        mode="edit"
      />,
    );

    expect(screen.getByLabelText("Habit name")).toHaveValue("Read");
    expect(screen.getByLabelText("Icon or emoji")).toHaveValue("📚");
    expect(screen.getByRole("radio", { name: /Plum/ })).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeInTheDocument();
  });
});
