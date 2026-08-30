import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { DashboardClient } from "./dashboard-client";
import type { UserRole } from "@/lib/types/enums";

export default async function DashboardPage() {
  // Temporary 0.9s delay for skeleton loading state preview
  await new Promise((resolve) => setTimeout(resolve, 900));

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role: UserRole = "admin";
  if (user) {
    const { data: appUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (appUser?.role) {
      role = appUser.role as UserRole;
    }
  }

  return (
    <div className="space-y-6">
      <DashboardClient role={role} />
    </div>
  );
}
