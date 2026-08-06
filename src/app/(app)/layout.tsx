import { redirect } from "next/navigation";

import { AppShell } from "../../components/app-shell/app-shell";
import { createServerSupabaseClient } from "../../lib/supabase/server";

export default async function ApplicationLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  return <AppShell>{children}</AppShell>;
}
