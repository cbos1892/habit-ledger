import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
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
          routineId: "",
          startDate: "2026-08-10",
          weekdays: [1, 2, 3, 4, 5, 6, 7],
        }}
        mode="create"
        routines={[]}
      />,
    );

    expect(screen.getByLabelText("Emojis")).toBeRequired();
    expect(screen.getByLabelText("Emojis")).toHaveAttribute("maxlength", "64");
    expect(screen.getByText(/one to three emojis/i)).toBeVisible();
    expect(screen.getByLabelText("Habit name")).toBeRequired();
    expect(screen.getByRole("radio", { name: /Fern/ })).toBeChecked();
    expect(screen.getByLabelText("Start date")).toHaveValue("2026-08-10");
    expect(screen.getByLabelText("Every day")).toBeChecked();
    expect(screen.getByLabelText("Monday")).toBeChecked();
    expect(screen.getByLabelText("Sunday")).toBeChecked();
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
          routineId: "",
          startDate: "2026-07-01",
          weekdays: [1, 3, 5],
        }}
        mode="edit"
        routines={[]}
      />,
    );

    expect(screen.getByLabelText("Habit name")).toHaveValue("Read");
    expect(screen.getByLabelText("Emojis")).toHaveValue("📚");
    expect(screen.getByRole("radio", { name: /Plum/ })).toBeChecked();
    expect(screen.getByLabelText("Monday")).toBeChecked();
    expect(screen.getByLabelText("Tuesday")).not.toBeChecked();
    expect(screen.getByLabelText("Friday")).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeInTheDocument();
  });

  it("can keep a habit standalone or place it in a routine", () => {
    const routineId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    render(
      <HabitForm
        action={action}
        initialValues={{
          name: "Read",
          icon: "📚",
          color: "plum",
          routineId,
          startDate: "2026-07-01",
          weekdays: [1, 3, 5],
        }}
        mode="edit"
        routines={[{ display_order: 0, id: routineId, name: "Morning reset" }]}
      />,
    );

    expect(screen.getByRole("combobox", { name: /Routine/ })).toHaveValue(
      routineId,
    );
    expect(screen.getByRole("option", { name: "Standalone" })).toBeVisible();
    expect(screen.getByRole("option", { name: "Morning reset" })).toBeVisible();
  });

  it("supports selecting every day or a custom non-empty set", () => {
    render(
      <HabitForm
        action={action}
        initialValues={{
          name: "Read",
          icon: "📚",
          color: "plum",
          routineId: "",
          startDate: "2026-07-01",
          weekdays: [1, 3, 5],
        }}
        mode="edit"
        routines={[]}
      />,
    );

    fireEvent.click(screen.getByLabelText("Every day"));
    expect(screen.getByLabelText("Every day")).toBeChecked();
    expect(screen.getByLabelText("Tuesday")).toBeChecked();

    fireEvent.click(screen.getByLabelText("Thursday"));
    expect(screen.getByLabelText("Every day")).not.toBeChecked();
    expect(screen.getByLabelText("Thursday")).not.toBeChecked();
    expect(screen.getByLabelText("Monday")).toBeChecked();
  });

  it("edits a saved weekly target and can switch back to weekdays", async () => {
    const user = userEvent.setup();
    render(
      <HabitForm
        action={action}
        initialValues={{
          name: "Workout",
          icon: "🏋️",
          color: "fern",
          routineId: "",
          startDate: "2026-08-10",
          weekdays: [1, 2, 3, 4, 5, 6, 7],
          weeklyTarget: "5",
        }}
        mode="edit"
        routines={[]}
      />,
    );

    const schedule = screen.getByRole("combobox", { name: "Schedule type" });
    const target = screen.getByRole("combobox", { name: "Times per week" });
    expect(schedule).toHaveValue("weekly");
    expect(target).toHaveValue("5");
    await user.selectOptions(target, "3");
    await user.selectOptions(schedule, "weekdays");
    expect(screen.getByLabelText("Every day")).toBeChecked();
    await user.selectOptions(schedule, "weekly");
    expect(
      screen.getByRole("combobox", { name: "Times per week" }),
    ).toHaveValue("3");
  });

  it("supports keyboard schedule editing", async () => {
    const user = userEvent.setup();
    render(
      <HabitForm
        action={action}
        initialValues={{
          name: "Read",
          icon: "📚",
          color: "plum",
          routineId: "",
          startDate: "2026-07-01",
          weekdays: [1, 3, 5],
        }}
        mode="edit"
        routines={[]}
      />,
    );

    const everyDay = screen.getByLabelText("Every day");
    everyDay.focus();
    await user.keyboard(" ");

    expect(everyDay).toBeChecked();
    expect(screen.getByLabelText("Tuesday")).toBeChecked();

    const thursday = screen.getByLabelText("Thursday");
    thursday.focus();
    await user.keyboard(" ");

    expect(thursday).not.toBeChecked();
    expect(everyDay).not.toBeChecked();
  });

  it("has no detectable structural accessibility violations", async () => {
    const { container } = render(
      <HabitForm
        action={action}
        initialValues={{
          name: "Read",
          icon: "📚",
          color: "plum",
          routineId: "",
          startDate: "2026-07-01",
          weekdays: [1, 3, 5],
        }}
        mode="edit"
        routines={[]}
      />,
    );

    const results = await axe.run(container, {
      rules: {
        // JSDOM does not calculate the rendered colors needed by this rule.
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations.map(({ id }) => id)).toEqual([]);
  });
});
