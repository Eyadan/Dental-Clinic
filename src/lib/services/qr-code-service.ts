import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { BaseService } from "./base-service";
import type { QrCode } from "@/lib/types/database";

export class QrCodeService extends BaseService {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async generateForAppointment(appointmentId: string): Promise<QrCode> {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase
      .from("qr_codes")
      .insert({
        appointment_id: appointmentId,
        token,
        expires_at: expiresAt,
        is_used: false,
      })
      .select()
      .single();

    if (error) this.handleError(error);
    return data as QrCode;
  }

  async validateToken(token: string): Promise<{ valid: boolean; qrCode: QrCode | null }> {
    const { data, error } = await this.supabase
      .from("qr_codes")
      .select("*")
      .eq("token", token)
      .single();

    if (error) {
      if (error.code === "PGRST116") return { valid: false, qrCode: null };
      this.handleError(error);
    }

    const qrCode = data as QrCode;
    if (!qrCode) return { valid: false, qrCode: null };

    if (qrCode.is_used) return { valid: false, qrCode };
    if (new Date(qrCode.expires_at) < new Date()) return { valid: false, qrCode };

    return { valid: true, qrCode };
  }

  async invalidateToken(token: string): Promise<void> {
    const { error } = await this.supabase
      .from("qr_codes")
      .update({ is_used: true })
      .eq("token", token);

    if (error) this.handleError(error);
  }

  async getActiveQRForAppointment(appointmentId: string): Promise<QrCode | null> {
    const { data, error } = await this.supabase
      .from("qr_codes")
      .select("*")
      .eq("appointment_id", appointmentId)
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) this.handleError(error);
    return data as QrCode | null;
  }
}
