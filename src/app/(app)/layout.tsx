import { AppShell } from "../../components/app-shell/app-shell";
import { TimeZoneSynchronizer } from "../../components/time-zone-synchronizer";
import { getCurrentTimeZoneContext } from "../../lib/profile";

export default async function ApplicationLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const context = await getCurrentTimeZoneContext();

  return (
    <AppShell>
      <TimeZoneSynchronizer
        serverTimeZone={context.time_zone}
        userId={context.id}
      />
      {children}
    </AppShell>
  );
}
