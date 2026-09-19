import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getServerUserContext } from "@/lib/supabase/user-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await getServerUserContext();

  if (!userId) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  const { data: appUser } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (!appUser) {
    redirect("/login");
  }

  const fullName = `${appUser.first_name} ${appUser.last_name}`;

  return (
    <DashboardShell
      role={appUser.role}
      userName={fullName}
      userEmail={appUser.email}
    >
      {children}
    </DashboardShell>
  );
}
