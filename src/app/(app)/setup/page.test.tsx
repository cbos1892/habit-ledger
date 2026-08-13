import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { requireCurrentUser } from "../../../lib/auth/current-user";
import { getActiveHabits, getArchivedHabits } from "../../../lib/habits";

import SetupPage from "./page";

vi.mock("../../../lib/auth/current-user", () => ({
  requireCurrentUser: vi.fn(),
}));
vi.mock("../../../lib/habits", () => ({
  getActiveHabits: vi.fn(),
  getArchivedHabits: vi.fn(),
}));
vi.mock("./habit-actions", () => ({
  archiveHabit: vi.fn(),
  moveHabit: vi.fn(),
  restoreHabit: vi.fn(),
}));

describe("Setup page", () => {
  it("does not put time-zone confirmation in the setup path", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue({ id: "user-123" });
    vi.mocked(getActiveHabits).mockResolvedValue([]);
    vi.mocked(getArchivedHabits).mockResolvedValue([]);

    render(await SetupPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Setup" })).toBeInTheDocument();
    expect(
      screen.queryByText(/confirm your time zone/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Time zone")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Advanced settings" }),
    ).toHaveAttribute("href", "/settings/time-zone");
  });
});
