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

export interface DashboardPaymentMethodSummary {
  method: string;
  label: string;
  amount: number;
  percentage: number;
}

export interface DashboardStatsData {
  pendingBookings: number;
  todayAppointments: number;
  inQueue: number;
  unreadMessages: number;
  // Financial & analytics metrics
  grossCollections: number;
  monthlyCollections: number;
  completedVisits: number;
  unpaidReceivables: number;
  averageSpend: number;
  paymentMethods: DashboardPaymentMethodSummary[];
}

export async function getDashboardStatsAction(): Promise<ServiceResult<DashboardStatsData>> {
  try {
    const supabase = await createServerSupabaseClient();
    const today = todayLocal();

    const [
      { count: pendingBookings },
      { count: todayAppointments },
      { count: inQueue },
      { count: unreadMessages },
      { data: paymentsData },
      { data: invoicesData },
      { count: completedVisitsCount },
    ] = await Promise.all([
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("booking_status", "pending")
        .eq("is_archived", false),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("scheduled_date", today)
        .eq("is_archived", false)
        .in("booking_status", ["approved", "confirmed"]),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("scheduled_date", today)
        .eq("is_archived", false)
        .in("visit_status", ["checked_in", "waiting", "treatment_ongoing", "treatment_paused"]),
      supabase
        .from("messenger_messages")
        .select("*", { count: "exact", head: true })
        .eq("direction", "inbound"),
      supabase
        .from("payments")
        .select("id, amount, method, paid_at"),
      supabase
        .from("invoices")
        .select("id, total_amount, payment_status"),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("visit_status", "completed")
        .eq("is_archived", false),
    ]);

    const payments = paymentsData ?? [];
    const invoices = invoicesData ?? [];
    const completedVisits = completedVisitsCount ?? 0;

    const grossCollections = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const currentYearMonth = today.slice(0, 7);
    const monthlyPayments = payments.filter((p) => (p.paid_at || "").startsWith(currentYearMonth));
    const monthlyCollections = monthlyPayments.length > 0
      ? monthlyPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
      : grossCollections;

    const unpaidReceivables = invoices
      .filter((inv) => inv.payment_status === "pending_payment" || inv.payment_status === "partially_paid")
      .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);

    const averageSpend = completedVisits > 0 ? grossCollections / completedVisits : 0;

    const methodTotals: Record<string, number> = {};
    for (const p of payments) {
      const m = p.method || "other";
      methodTotals[m] = (methodTotals[m] || 0) + (Number(p.amount) || 0);
    }

    const methodLabels: Record<string, string> = {
      cash: "Cash",
      gcash: "GCash",
      maya: "Maya",
      card: "Credit / Debit Card",
      bank_transfer: "Bank Transfer",
    };

    const paymentMethods: DashboardPaymentMethodSummary[] = Object.entries(methodTotals).map(([method, amount]) => ({
      method,
      label: methodLabels[method] || method.toUpperCase(),
      amount,
      percentage: grossCollections > 0 ? Math.round((amount / grossCollections) * 100) : 0,
    }));

    return {
      success: true,
      data: {
        pendingBookings: pendingBookings ?? 0,
        todayAppointments: todayAppointments ?? 0,
        inQueue: inQueue ?? 0,
        unreadMessages: unreadMessages ?? 0,
        grossCollections,
        monthlyCollections,
        completedVisits,
        unpaidReceivables,
        averageSpend,
        paymentMethods,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stats",
    };
  }
}
