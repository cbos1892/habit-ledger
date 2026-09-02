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
          startDate: "2026-08-10",
          weekdays: [1, 2, 3, 4, 5, 6, 7],
        }}
        mode="create"
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
          startDate: "2026-07-01",
          weekdays: [1, 3, 5],
        }}
        mode="edit"
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

  it("supports selecting every day or a custom non-empty set", () => {
    render(
      <HabitForm
        action={action}
        initialValues={{
          name: "Read",
          icon: "📚",
          color: "plum",
          startDate: "2026-07-01",
          weekdays: [1, 3, 5],
        }}
        mode="edit"
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

  it("supports keyboard schedule editing", async () => {
    const user = userEvent.setup();
    render(
      <HabitForm
        action={action}
        initialValues={{
          name: "Read",
          icon: "📚",
          color: "plum",
          startDate: "2026-07-01",
          weekdays: [1, 3, 5],
        }}
        mode="edit"
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
          startDate: "2026-07-01",
          weekdays: [1, 3, 5],
        }}
        mode="edit"
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
