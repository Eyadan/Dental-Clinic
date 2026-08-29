"use server";

import { revalidatePath } from "next/cache";
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
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("clinic_settings")
      .select("*")
      .order("category", { ascending: true })
      .order("setting_key", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) return { success: false, error: error.message };

    return { success: true, data: (data ?? []) as SettingItem[] };
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

    for (const setting of settings) {
      const { error } = await supabase
        .from("clinic_settings")
        .update({
          setting_value: setting.setting_value,
          updated_at: new Date().toISOString(),
        })
        .eq("id", setting.id);

      if (error) return { success: false, error: `Failed to save setting: ${error.message}` };
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "settings_updated",
      entity_type: "clinic_settings",
      metadata: { count: settings.length, keys: settings.map((s) => s.id) },
    });

    revalidatePath("/settings");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save settings",
    };
  }
}
