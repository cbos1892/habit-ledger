import { AppShell } from "../../components/app-shell/app-shell";
import { requireCurrentUser } from "../../lib/auth/current-user";

export default async function ApplicationLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireCurrentUser();

  return <AppShell>{children}</AppShell>;
}
