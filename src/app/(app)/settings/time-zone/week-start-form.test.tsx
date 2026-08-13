import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WeekStartForm } from "./week-start-form";

vi.mock("./actions", () => ({
  updateWeekStart: vi.fn(async () => ({ status: "idle" })),
}));

describe("WeekStartForm", () => {
  it("renders mutually exclusive range choices and keeps the saved value", () => {
    render(<WeekStartForm initialWeekStartsOn={0} />);

    const monday = screen.getByRole("radio", { name: /Monday–Sunday/ });
    const sunday = screen.getByRole("radio", { name: /Sunday–Saturday/ });

    expect(monday).not.toBeChecked();
    expect(sunday).toBeChecked();
    expect(monday).toHaveAttribute("name", "weekStartsOn");
    expect(sunday).toHaveAttribute("name", "weekStartsOn");
    expect(screen.getByText("Monday, Aug 10 – Sunday, Aug 16")).toBeVisible();
    expect(screen.getByText("Sunday, Aug 9 – Saturday, Aug 15")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Save week layout" }),
    ).toBeVisible();
  });
});
