"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import type { ServiceResult } from "@/lib/services/base-service";

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

export async function getAuditLogsAction(params: {
  entityType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<ServiceResult<{ logs: AuditLogEntry[]; total: number }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from("audit_logs")
      .select(`
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        metadata,
        timestamp,
        users(first_name, last_name)
      `, { count: "exact" })
      .order("timestamp", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (params.entityType) {
      query = query.eq("entity_type", params.entityType);
    }
    if (params.userId) {
      query = query.eq("user_id", params.userId);
    }
    if (params.startDate) {
      query = query.gte("timestamp", `${params.startDate}T00:00:00`);
    }
    if (params.endDate) {
      query = query.lte("timestamp", `${params.endDate}T23:59:59`);
    }

    const { data, error, count } = await query;

    if (error) return { success: false, error: error.message };

    const logs: AuditLogEntry[] = (data ?? []).map((entry: Record<string, unknown>) => {
      const user = entry.users as { first_name: string; last_name: string } | null;
      return {
        id: entry.id as string,
        user_id: entry.user_id as string | null,
        user_name: user ? `${user.first_name} ${user.last_name}` : "System",
        action: entry.action as string,
        entity_type: entry.entity_type as string,
        entity_id: entry.entity_id as string | null,
        metadata: entry.metadata as Record<string, unknown> | null,
        timestamp: entry.timestamp as string,
      };
    });

    return { success: true, data: { logs, total: count ?? 0 } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch audit logs",
    };
  }
}

export async function getStaffUsersAction(): Promise<ServiceResult<{ id: string; name: string }[]>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .eq("is_active", true)
      .order("first_name");

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: (data ?? []).map((u) => ({ id: u.id, name: `${u.first_name} ${u.last_name}` })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch users",
    };
  }
}
