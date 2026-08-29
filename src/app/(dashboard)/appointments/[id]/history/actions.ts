"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import type { ServiceResult } from "@/lib/services/base-service";

export interface HistoryEntry {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
}

export async function getAppointmentHistoryAction(
  appointmentId: string,
): Promise<ServiceResult<HistoryEntry[]>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("appointment_history")
      .select(`
        id,
        field_name,
        old_value,
        new_value,
        changed_by,
        changed_at,
        users(first_name, last_name)
      `)
      .eq("appointment_id", appointmentId)
      .order("changed_at", { ascending: false });

    if (error) return { success: false, error: error.message };

    const entries: HistoryEntry[] = (data ?? []).map((entry: Record<string, unknown>) => {
      const user = entry.users as { first_name: string; last_name: string } | null;
      return {
        id: entry.id as string,
        field_name: entry.field_name as string,
        old_value: entry.old_value as string | null,
        new_value: entry.new_value as string | null,
        changed_by: user ? `${user.first_name} ${user.last_name}` : "System",
        changed_at: entry.changed_at as string,
      };
    });

    return { success: true, data: entries };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch appointment history",
    };
  }
}
