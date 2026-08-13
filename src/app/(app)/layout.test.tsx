import { describe, expect, it, vi } from "vitest";

import { AppShell } from "../../components/app-shell/app-shell";
import { TimeZoneSynchronizer } from "../../components/time-zone-synchronizer";
import { getCurrentTimeZoneContext } from "../../lib/profile";
import ApplicationLayout from "./layout";

vi.mock("../../lib/profile", () => ({
  getCurrentTimeZoneContext: vi.fn(),
}));

describe("authenticated application layout", () => {
  it("validates the current user on the server before rendering private content", async () => {
    vi.mocked(getCurrentTimeZoneContext).mockResolvedValue({
      id: "user-123",
      time_zone: "America/New_York",
    });
    const children = <p>Private content</p>;

    const result = await ApplicationLayout({ children });

    expect(getCurrentTimeZoneContext).toHaveBeenCalledOnce();
    expect(result.type).toBe(AppShell);
    expect(result.props.children[0].type).toBe(TimeZoneSynchronizer);
    expect(result.props.children[0].props).toMatchObject({
      serverTimeZone: "America/New_York",
      userId: "user-123",
    });
    expect(result.props.children[1]).toBe(children);
  });
});
