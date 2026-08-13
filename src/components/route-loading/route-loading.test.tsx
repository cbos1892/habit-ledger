import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RouteLoading } from "./route-loading";

describe("RouteLoading", () => {
  it.each([
    ["today", "Today", "Gathering today's habits…"],
    ["week", "Week", "Gathering your week…"],
    ["stats", "Stats", "Gathering your progress…"],
    ["setup", "Setup", "Loading your habit setup…"],
  ] as const)(
    "provides an accessible, destination-shaped %s fallback",
    (variant, title, status) => {
      const { container } = render(<RouteLoading variant={variant} />);

      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(status);
      expect(container.firstChild).toHaveAttribute("aria-busy", "true");
      expect(container.firstChild).toHaveAttribute(
        "data-route-loading",
        variant,
      );
    },
  );
});
