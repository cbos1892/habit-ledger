"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getDetectedBrowserTimeZone } from "@/lib/time-zone";

type TimeZoneSynchronizerProps = Readonly<{
  serverTimeZone: string;
  userId: string;
}>;

const retryDelays = [0, 2_000, 10_000] as const;

export function TimeZoneSynchronizer({
  serverTimeZone,
  userId,
}: TimeZoneSynchronizerProps) {
  const router = useRouter();

  useEffect(() => {
    const browserTimeZone = getDetectedBrowserTimeZone();
    const storageKey = `habit-ledger:time-zone:${userId}`;

    if (!browserTimeZone) return;

    const lastSynchronization = localStorage.getItem(storageKey);
    const preservedManualValue = `manual:${browserTimeZone}:${serverTimeZone}`;

    if (
      lastSynchronization === preservedManualValue ||
      (browserTimeZone === serverTimeZone &&
        lastSynchronization === browserTimeZone)
    ) {
      return;
    }

    let cancelled = false;
    const timeouts = new Set<ReturnType<typeof setTimeout>>();

    const synchronize = async (attempt: number) => {
      try {
        const response = await fetch("/api/time-zone", {
          body: JSON.stringify({ timeZone: browserTimeZone }),
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          method: "POST",
        });

        if (!response.ok) throw new Error("Time-zone synchronization failed");

        const result = (await response.json()) as {
          result?: string;
          timeZone?: string;
        };

        if (cancelled) return;

        localStorage.setItem(
          storageKey,
          result.result === "preserved-manual"
            ? preservedManualValue
            : browserTimeZone,
        );

        if (
          result.result === "synchronized" &&
          result.timeZone !== serverTimeZone
        ) {
          router.refresh();
        }
      } catch {
        const nextDelay = retryDelays[attempt + 1];

        if (!cancelled && nextDelay !== undefined) {
          const timeout = setTimeout(() => synchronize(attempt + 1), nextDelay);
          timeouts.add(timeout);
        }
      }
    };

    void synchronize(0);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [router, serverTimeZone, userId]);

  return null;
}
