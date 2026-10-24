import { getServerUserContext } from "@/lib/supabase/user-context";
import { getDashboardStatsAction, getPendingStaffNotificationsAction } from "./actions";
import { DashboardClient } from "./dashboard-client";
import type { UserRole } from "@/lib/types/enums";

export default async function DashboardPage() {
  const [{ role: ctxRole }, statsResult, notifResult] = await Promise.all([
    getServerUserContext(),
    getDashboardStatsAction(),
    getPendingStaffNotificationsAction(),
  ]);

  const role: UserRole = ctxRole ?? "admin";
  const initialStats = statsResult.success && statsResult.data ? statsResult.data : null;
  const initialNotifications = notifResult.success && notifResult.data ? notifResult.data : [];

  return (
    <div className="space-y-6">
      <DashboardClient
        role={role}
        initialStats={initialStats}
        initialNotifications={initialNotifications}
      />
    </div>
  );
}
