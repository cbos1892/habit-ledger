import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDetectedBrowserTimeZone } from "@/lib/time-zone";

import { TimeZoneSynchronizer } from "./time-zone-synchronizer";

const refresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));
vi.mock("@/lib/time-zone", () => ({
  getDetectedBrowserTimeZone: vi.fn(),
}));

describe("TimeZoneSynchronizer", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    });
    refresh.mockReset();
    vi.mocked(getDetectedBrowserTimeZone).mockReturnValue("America/New_York");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("silently synchronizes a changed browser zone and refreshes server context", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: "synchronized",
          timeZone: "America/New_York",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<TimeZoneSynchronizer serverTimeZone="UTC" userId="user-123" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/time-zone",
      expect.objectContaining({
        body: JSON.stringify({ timeZone: "America/New_York" }),
        method: "POST",
      }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(localStorage.getItem("habit-ledger:time-zone:user-123")).toBe(
      "America/New_York",
    );
  });

  it("keeps failed retries bounded and does not interrupt rendering", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(
      <TimeZoneSynchronizer serverTimeZone="UTC" userId="user-123" />,
    );

    expect(container).toBeEmptyDOMElement();
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("remembers a preserved manual choice instead of repeatedly syncing travel changes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: "preserved-manual",
          timeZone: "America/Chicago",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = render(
      <TimeZoneSynchronizer
        serverTimeZone="America/Chicago"
        userId="user-123"
      />,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    first.unmount();

    render(
      <TimeZoneSynchronizer
        serverTimeZone="America/Chicago"
        userId="user-123"
      />,
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does nothing when browser detection is unavailable", () => {
    vi.mocked(getDetectedBrowserTimeZone).mockReturnValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<TimeZoneSynchronizer serverTimeZone="UTC" userId="user-123" />);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
