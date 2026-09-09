import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TodayConcept } from "./today-concept";

describe("TodayConcept", () => {
  it("switches appearance and exposes the active choice", () => {
    render(<TodayConcept />);

    const dark = screen.getByRole("button", { name: "dark" });
    fireEvent.click(dark);

    expect(dark).toHaveAttribute("aria-pressed", "true");
  });

  it("toggles habits and updates progress", () => {
    render(<TodayConcept />);

    const read = screen.getByRole("button", { name: /Read 20 minutes/ });
    expect(read).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(read);

    expect(read).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("progressbar", { name: "4 of 5 habits complete" }),
    ).toBeInTheDocument();
  });

  it("previews empty, loading, and error states", () => {
    render(<TodayConcept />);

    const state = screen.getByRole("combobox", { name: "State" });

    fireEvent.change(state, { target: { value: "empty" } });
    expect(
      screen.getByRole("heading", { name: "Nothing is scheduled today." }),
    ).toBeInTheDocument();

    fireEvent.change(state, { target: { value: "loading" } });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading today’s habits",
    );

    fireEvent.change(state, { target: { value: "error" } });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your habits are temporarily unavailable.",
    );
  });
});
