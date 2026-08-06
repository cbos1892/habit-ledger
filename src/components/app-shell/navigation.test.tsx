import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrimaryNavigation } from "./navigation";

const navigation = vi.hoisted(() => ({ activeSegment: "today" }));

vi.mock("next/navigation", () => ({
  useSelectedLayoutSegment: () => navigation.activeSegment,
}));

describe("PrimaryNavigation", () => {
  beforeEach(() => {
    navigation.activeSegment = "today";
  });

  it("links all four primary destinations", () => {
    render(<PrimaryNavigation />);

    expect(
      screen.getByRole("navigation", { name: "Primary navigation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute(
      "href",
      "/today",
    );
    expect(screen.getByRole("link", { name: "Week" })).toHaveAttribute(
      "href",
      "/week",
    );
    expect(screen.getByRole("link", { name: "Stats" })).toHaveAttribute(
      "href",
      "/stats",
    );
    expect(screen.getByRole("link", { name: "Setup" })).toHaveAttribute(
      "href",
      "/setup",
    );
  });

  it("announces the current destination", () => {
    navigation.activeSegment = "week";
    render(<PrimaryNavigation />);

    expect(screen.getByRole("link", { name: "Week" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Today" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
