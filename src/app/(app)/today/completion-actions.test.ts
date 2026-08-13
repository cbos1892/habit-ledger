import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { refresh } from "next/cache";

import { requireTimeZoneContext } from "@/lib/profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { setHabitCompletion } from "./completion-actions";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/profile", () => ({ requireTimeZoneContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const habitId = "4d91111d-df1b-41f7-917f-a67a6ec1e20d";
const completionId = "1ebf23fd-61d1-4d9a-a376-ebfd9ec8ba4e";

function createSupabaseMock({
  archivedAt = null as string | null,
  completion = { id: completionId } as { id: string } | null,
  mutationError = null as { message: string } | null,
} = {}) {
  const habitMaybeSingle = vi.fn().mockResolvedValue({
    data: {
      id: habitId,
      start_date: "2026-08-01",
      archived_at: archivedAt,
      habit_schedules: [{ weekday: 1 }],
    },
    error: null,
  });
  const habitQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: habitMaybeSingle,
  };
  habitQuery.select.mockReturnValue(habitQuery);
  habitQuery.eq.mockReturnValue(habitQuery);
  habitQuery.is.mockReturnValue(habitQuery);

  const upsert = vi.fn().mockResolvedValue({ error: mutationError });
  const deleteDateEq = vi.fn().mockResolvedValue({ error: mutationError });
  const deleteOwnerEq = vi.fn(() => ({ eq: deleteDateEq }));
  const deleteHabitEq = vi.fn(() => ({ eq: deleteOwnerEq }));
  const deleteCompletion = vi.fn(() => ({ eq: deleteHabitEq }));

  const completionMaybeSingle = vi.fn().mockResolvedValue({
    data: completion,
    error: null,
  });
  const readDateEq = vi.fn(() => ({ maybeSingle: completionMaybeSingle }));
  const readOwnerEq = vi.fn(() => ({ eq: readDateEq }));
  const readHabitEq = vi.fn(() => ({ eq: readOwnerEq }));
  const completionSelect = vi.fn(() => ({ eq: readHabitEq }));
  const completionTable = {
    delete: deleteCompletion,
    select: completionSelect,
    upsert,
  };

  const from = vi.fn((table: string) =>
    table === "habits" ? habitQuery : completionTable,
  );

  return {
    client: { from },
    completionSelect,
    deleteCompletion,
    deleteDateEq,
    from,
    habitQuery,
    upsert,
  };
}

describe("Today completion actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T12:00:00.000Z"));
    vi.mocked(requireTimeZoneContext).mockResolvedValue({
      id: "user-123",
      time_zone: "UTC",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("idempotently completes today's owned, scheduled habit", async () => {
    const mock = createSupabaseMock();
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      mock.client as never,
    );

    await expect(setHabitCompletion(habitId, true)).resolves.toEqual({
      status: "success",
      habitId,
      completed: true,
      completionId,
      localDate: "2026-08-10",
    });
    expect(mock.habitQuery.eq).toHaveBeenCalledWith("owner_id", "user-123");
    expect(mock.upsert).toHaveBeenCalledWith(
      {
        habit_id: habitId,
        local_date: "2026-08-10",
        owner_id: "user-123",
      },
      {
        ignoreDuplicates: true,
        onConflict: "habit_id,local_date",
      },
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("undoes with a delete constrained by habit, owner, and local date", async () => {
    const mock = createSupabaseMock({ completion: null });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      mock.client as never,
    );

    await expect(setHabitCompletion(habitId, false)).resolves.toMatchObject({
      status: "success",
      completed: false,
      completionId: null,
    });
    expect(mock.deleteCompletion).toHaveBeenCalledOnce();
    expect(mock.deleteDateEq).toHaveBeenCalledWith("local_date", "2026-08-10");
    expect(mock.upsert).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("returns a recoverable error and skips refresh when persistence fails", async () => {
    const mock = createSupabaseMock({
      mutationError: { message: "database unavailable" },
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      mock.client as never,
    );

    await expect(setHabitCompletion(habitId, true)).resolves.toMatchObject({
      status: "error",
      message: expect.stringContaining("previous check-in is restored"),
    });
    expect(mock.completionSelect).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("writes an explicit eligible past local date for the weekly grid", async () => {
    const mock = createSupabaseMock({
      archivedAt: "2026-08-05T17:00:00.000Z",
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      mock.client as never,
    );

    await expect(
      setHabitCompletion(habitId, true, "2026-08-03"),
    ).resolves.toMatchObject({
      status: "success",
      localDate: "2026-08-03",
    });
    expect(mock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ local_date: "2026-08-03" }),
      expect.anything(),
    );
  });

  it("rejects future and unscheduled explicit dates", async () => {
    const mock = createSupabaseMock();
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      mock.client as never,
    );

    await expect(
      setHabitCompletion(habitId, true, "2026-08-11"),
    ).resolves.toMatchObject({ status: "error" });
    await expect(
      setHabitCompletion(habitId, true, "2026-08-09"),
    ).resolves.toMatchObject({ status: "error" });

    expect(mock.upsert).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("rejects edits after a habit's local archive date", async () => {
    const mock = createSupabaseMock({
      archivedAt: "2026-08-02T17:00:00.000Z",
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      mock.client as never,
    );

    await expect(
      setHabitCompletion(habitId, true, "2026-08-03"),
    ).resolves.toMatchObject({ status: "error" });
    expect(mock.upsert).not.toHaveBeenCalled();
  });

  it("rejects malformed habit IDs before authentication or database access", async () => {
    await expect(
      setHabitCompletion("not-a-habit", true),
    ).resolves.toMatchObject({ status: "error" });

    expect(requireTimeZoneContext).not.toHaveBeenCalled();
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });
});
