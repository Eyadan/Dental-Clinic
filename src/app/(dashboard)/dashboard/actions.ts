"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { todayLocal } from "@/lib/utils/date-utils";
import type { ServiceResult } from "@/lib/services/base-service";

export interface StaffNotification {
  id: string;
  action: string;
  entity_type: string;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

export async function getPendingStaffNotificationsAction(): Promise<ServiceResult<StaffNotification[]>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, action, entity_type, metadata, timestamp")
      .eq("action", "messenger_notification_failed")
      .order("timestamp", { ascending: false })
      .limit(10);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as StaffNotification[]) ?? [] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch notifications",
    };
  }
}

export async function dismissStaffNotificationAction(
  notificationId: string,
): Promise<ServiceResult<void>> {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/admin-client");
    const adminClient = await createServiceRoleClient();

    const { error } = await adminClient
      .from("audit_logs")
      .delete()
      .eq("id", notificationId)
      .eq("action", "messenger_notification_failed");

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to dismiss notification",
    };
  }
}

export async function getDashboardStatsAction(): Promise<ServiceResult<{
  pendingBookings: number;
  todayAppointments: number;
  inQueue: number;
  unreadMessages: number;
}>> {
  try {
    const supabase = await createServerSupabaseClient();
    const today = todayLocal();

    const { count: pendingBookings } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("booking_status", "pending")
      .eq("is_archived", false);

    const { count: todayAppointments } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("scheduled_date", today)
      .eq("is_archived", false)
      .in("booking_status", ["approved", "confirmed"]);

    const { count: inQueue } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("scheduled_date", today)
      .eq("is_archived", false)
      .in("visit_status", ["checked_in", "waiting", "treatment_ongoing", "treatment_paused"]);

    const { count: unreadMessages } = await supabase
      .from("messenger_messages")
      .select("*", { count: "exact", head: true })
      .eq("direction", "inbound");

    return {
      success: true,
      data: {
        pendingBookings: pendingBookings ?? 0,
        todayAppointments: todayAppointments ?? 0,
        inQueue: inQueue ?? 0,
        unreadMessages: unreadMessages ?? 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stats",
    };
  }
}
