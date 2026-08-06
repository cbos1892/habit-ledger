import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  Button,
  Card,
  CheckControl,
  Feedback,
  SelectField,
  TextAreaField,
  TextField,
} from ".";

describe("UI primitives", () => {
  it("renders button variants with safe button defaults", () => {
    const onClick = vi.fn();

    render(
      <Button onClick={onClick} variant="secondary">
        Save habit
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save habit" });
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("keeps cards flexible for semantic content", () => {
    render(
      <Card aria-label="Habit preview">
        <h2>Morning walk</h2>
      </Card>,
    );

    expect(screen.getByLabelText("Habit preview")).toContainElement(
      screen.getByRole("heading", { name: "Morning walk" }),
    );
  });

  it("associates text controls with labels, help, and errors", () => {
    render(
      <>
        <TextField
          description="Shown on your dashboard."
          id="name"
          label="Habit name"
        />
        <TextField error="A name is required." id="slug" label="Short name" />
        <SelectField id="color" label="Color">
          <option>Fern</option>
        </SelectField>
        <TextAreaField id="notes" label="Notes" optional />
      </>,
    );

    expect(screen.getByLabelText("Habit name")).toHaveAccessibleDescription(
      "Shown on your dashboard.",
    );
    expect(screen.getByLabelText("Short name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Short name")).toHaveAccessibleDescription(
      "A name is required.",
    );
    expect(screen.getByRole("combobox", { name: "Color" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes/)).toBeInTheDocument();
  });

  it("uses a native, labelled checkbox", () => {
    render(
      <CheckControl
        description="Include this day in the schedule."
        id="monday"
        label="Monday"
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Monday" });
    expect(checkbox).toHaveAccessibleDescription(
      "Include this day in the schedule.",
    );
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("announces danger feedback assertively and other feedback politely", () => {
    const { rerender } = render(
      <Feedback title="Habit saved" tone="success">
        Ready for tomorrow.
      </Feedback>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Habit savedReady for tomorrow.",
    );

    rerender(
      <Feedback title="Could not save" tone="danger">
        Try again.
      </Feedback>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not saveTry again.",
    );
  });
});
