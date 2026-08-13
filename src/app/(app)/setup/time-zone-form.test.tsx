import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TimeZoneForm } from "./time-zone-form";

vi.mock("./actions", () => ({
  updateTimeZone: vi.fn(async () => ({ status: "idle" })),
}));

describe("TimeZoneForm", () => {
  it("shows the browser time zone as context without overwriting the manual value", () => {
    const resolvedOptions = vi
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockReturnValue({
        calendar: "gregory",
        locale: "en-US",
        numberingSystem: "latn",
        timeZone: "America/Los_Angeles",
      });

    render(<TimeZoneForm initialTimeZone="UTC" />);

    expect(screen.getByLabelText("Time zone")).toHaveValue("UTC");
    expect(
      screen.getByText(/browser reports America\/Los_Angeles/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save time zone" }),
    ).toBeInTheDocument();
    resolvedOptions.mockRestore();
  });

  it("keeps the persisted value when editing settings later", () => {
    render(<TimeZoneForm initialTimeZone="America/New_York" />);

    expect(screen.getByLabelText("Time zone")).toHaveValue("America/New_York");
    expect(
      screen.getByRole("button", { name: "Save time zone" }),
    ).toBeInTheDocument();
  });
});
