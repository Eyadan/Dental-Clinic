"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { QrCodeService } from "@/lib/services/qr-code-service";
import type { ServiceResult } from "@/lib/services/base-service";
import type { QrCode } from "@/lib/types/database";

export async function generateQrCodeAction(
  appointmentId: string,
): Promise<ServiceResult<{ token: string; expiresAt: string }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const service = new QrCodeService(supabase);

    const existing = await service.getActiveQRForAppointment(appointmentId);
    if (existing) {
      return {
        success: true,
        data: { token: existing.token, expiresAt: existing.expires_at },
      };
    }

    const qrCode = await service.generateForAppointment(appointmentId);
    revalidatePath(`/check-in/qr/${appointmentId}`);
    return {
      success: true,
      data: { token: qrCode.token, expiresAt: qrCode.expires_at },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate QR code",
    };
  }
}

export async function getActiveQrCodeAction(
  appointmentId: string,
): Promise<ServiceResult<{ token: string; expiresAt: string } | null>> {
  try {
    const supabase = await createServerSupabaseClient();
    const service = new QrCodeService(supabase);
    const existing = await service.getActiveQRForAppointment(appointmentId);

    if (!existing) return { success: true, data: null };

    return {
      success: true,
      data: { token: existing.token, expiresAt: existing.expires_at },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get QR code",
    };
  }
}
