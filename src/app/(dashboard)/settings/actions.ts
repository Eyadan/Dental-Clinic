"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS, getCachedClinicSettings } from "@/lib/cache/reference-data";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import type { ServiceResult } from "@/lib/services/base-service";

export interface SettingItem {
  id: string;
  setting_key: string;
  setting_value: string;
  category: string;
  data_type: string;
}

export async function getSettingsAction(category?: string): Promise<ServiceResult<SettingItem[]>> {
  try {
    const settings = await getCachedClinicSettings();
    const data = category ? settings.filter((s) => s.category === category) : settings;

    return { success: true, data: data as SettingItem[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch settings",
    };
  }
}

export async function saveSettingsAction(
  settings: { id: string; setting_value: string }[],
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };
    if (settings.length === 0) return { success: true, data: undefined };

    // Single RPC call so all settings are updated in one transaction
    // (atomic — either all values change or none do) instead of N
    // sequential round-trips that could partially fail.
    const { error: rpcError } = await supabase.rpc("bulk_update_clinic_settings", {
      updates: settings,
    });

    if (rpcError) return { success: false, error: `Failed to save settings: ${rpcError.message}` };

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "settings_updated",
      entity_type: "clinic_settings",
      metadata: { count: settings.length, keys: settings.map((s) => s.id) },
    });

    revalidateTag(CACHE_TAGS.clinicSettings, { expire: 0 });
    revalidatePath("/settings");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save settings",
    };
  }
}
