import { getServerUserContext } from "@/lib/supabase/user-context";
import { DashboardClient } from "./dashboard-client";
import type { UserRole } from "@/lib/types/enums";

export default async function DashboardPage() {
  const { role: ctxRole } = await getServerUserContext();
  const role: UserRole = ctxRole ?? "admin";

  return (
    <div className="space-y-6">
      <DashboardClient role={role} />
    </div>
  );
}
