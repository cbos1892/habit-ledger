import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RoutePlaceholder } from "./route-placeholder";

describe("RoutePlaceholder", () => {
  it("provides a labelled placeholder state", () => {
    render(
      <RoutePlaceholder
        eyebrow="Daily check-in"
        title="Today"
        description="Check in with today's habits."
        nextStep="Habits will appear here."
      />,
    );

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Habits will appear here." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ready for the next build")).toBeInTheDocument();
  });
});
