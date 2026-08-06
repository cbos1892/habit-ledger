import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TimeZoneForm } from "./time-zone-form";

vi.mock("./actions", () => ({
  updateTimeZone: vi.fn(async () => ({ status: "idle" })),
}));

describe("TimeZoneForm", () => {
  it("proposes the browser time zone during onboarding", () => {
    const resolvedOptions = vi
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockReturnValue({
        calendar: "gregory",
        locale: "en-US",
        numberingSystem: "latn",
        timeZone: "America/Los_Angeles",
      });

    render(<TimeZoneForm initialTimeZone="UTC" isOnboarding />);

    expect(screen.getByLabelText("Time zone")).toHaveValue(
      "America/Los_Angeles",
    );
    expect(
      screen.getByText(/browser reports America\/Los_Angeles/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm and continue" }),
    ).toBeInTheDocument();
    resolvedOptions.mockRestore();
  });

  it("keeps the persisted value when editing settings later", () => {
    render(
      <TimeZoneForm initialTimeZone="America/New_York" isOnboarding={false} />,
    );

    expect(screen.getByLabelText("Time zone")).toHaveValue("America/New_York");
    expect(
      screen.getByRole("button", { name: "Save time zone" }),
    ).toBeInTheDocument();
  });
});
