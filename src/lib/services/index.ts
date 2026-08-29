import type { SupabaseClient } from "@supabase/supabase-js";
import type { User, Dentist, DentalService, ClinicSetting } from "@/lib/types/database";
import { BaseService } from "./base-service";

export class AuthService extends BaseService {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) this.handleError(error);

    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) this.handleError(error);
  }

  async getCurrentUser(): Promise<{ user: User | null; dentist: Dentist | null }> {
    const { data: authData } = await this.supabase.auth.getUser();

    if (!authData.user) return { user: null, dentist: null };

    const { data: user, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return { user: null, dentist: null };
      this.handleError(error);
    }

    let dentist: Dentist | null = null;
    if (user?.role === "dentist") {
      const { data: dentistData } = await this.supabase
        .from("dentists")
        .select("*")
        .eq("user_id", user.id)
        .single();

      dentist = dentistData;
    }

    return { user, dentist };
  }
}

export class DentalServiceService extends BaseService {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async getServices(): Promise<DentalService[]> {
    const { data, error } = await this.supabase
      .from("dental_services")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) this.handleError(error);

    return data ?? [];
  }

  async getAllServices(): Promise<DentalService[]> {
    const { data, error } = await this.supabase
      .from("dental_services")
      .select("*")
      .order("is_active", { ascending: false })
      .order("name");

    if (error) this.handleError(error);

    return data ?? [];
  }

  async createService(data: { name: string; description?: string; default_duration_minutes: number; default_price?: number }): Promise<DentalService> {
    const { data: result, error } = await this.supabase
      .from("dental_services")
      .insert(data)
      .select()
      .single();

    if (error) this.handleError(error);

    return result;
  }

  async updateService(id: string, data: { name?: string; description?: string; default_duration_minutes?: number; default_price?: number }): Promise<DentalService> {
    const { data: result, error } = await this.supabase
      .from("dental_services")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) this.handleError(error);

    return result;
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await this.supabase
      .from("dental_services")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) this.handleError(error);
  }
}

export class ClinicService extends BaseService {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async getSettings(): Promise<ClinicSetting[]> {
    const { data, error } = await this.supabase
      .from("clinic_settings")
      .select("*")
      .order("category")
      .order("setting_key");

    if (error) this.handleError(error);

    return data ?? [];
  }

  async getSetting(key: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("clinic_settings")
      .select("setting_value")
      .eq("setting_key", key)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      this.handleError(error);
    }

    return data?.setting_value ?? null;
  }

  async updateSetting(key: string, value: string): Promise<void> {
    const { error } = await this.supabase
      .from("clinic_settings")
      .update({ setting_value: value })
      .eq("setting_key", key);

    if (error) this.handleError(error);
  }
}
