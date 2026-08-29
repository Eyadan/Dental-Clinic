import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
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
