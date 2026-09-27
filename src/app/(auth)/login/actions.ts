"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server-client";

export async function loginAction(formData: { email: string; password: string }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected authentication error occurred";
    return { success: false, error: message };
  }
}
