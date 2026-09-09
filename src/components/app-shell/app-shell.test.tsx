import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "./app-shell";

vi.mock("./navigation", () => ({
  PrimaryNavigation: () => (
    <nav aria-label="Primary navigation">Navigation</nav>
  ),
}));

describe("AppShell", () => {
  it("provides a named sidebar and a reliable skip target", () => {
    render(
      <AppShell>
        <h1>Today</h1>
      </AppShell>,
    );

    expect(
      screen.getByRole("complementary", { name: "Application sidebar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
    expect(
      screen.getByRole("link", { name: "Skip to main content" }),
    ).toHaveAttribute("href", "#main-content");
  });

  it("keeps existing time-zone navigation and sign-out submissions available", () => {
    render(<AppShell>Content</AppShell>);

    expect(screen.getByRole("link", { name: "Time zone" })).toHaveAttribute(
      "href",
      "/settings/time-zone",
    );
    expect(screen.getAllByRole("button", { name: "Sign out" })).toHaveLength(2);
    expect(
      document.querySelectorAll('form[action="/auth/sign-out"]'),
    ).toHaveLength(2);
  });
});
