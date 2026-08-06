import { describe, expect, it, vi } from "vitest";

import { AppShell } from "../../components/app-shell/app-shell";
import { requireCurrentUser } from "../../lib/auth/current-user";
import ApplicationLayout from "./layout";

vi.mock("../../lib/auth/current-user", () => ({
  requireCurrentUser: vi.fn(),
}));

describe("authenticated application layout", () => {
  it("validates the current user on the server before rendering private content", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue({ id: "user-123" });
    const children = <p>Private content</p>;

    const result = await ApplicationLayout({ children });

    expect(requireCurrentUser).toHaveBeenCalledOnce();
    expect(result.type).toBe(AppShell);
    expect(result.props.children).toBe(children);
  });
});
