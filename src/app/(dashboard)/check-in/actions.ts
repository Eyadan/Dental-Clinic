"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { AppointmentService } from "@/lib/services/appointment-service";
import type { ServiceResult } from "@/lib/services/base-service";

export async function checkInPatientAction(
  appointmentId: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("booking_status, visit_status")
      .eq("id", appointmentId)
      .single();

    if (fetchError) {
      return { success: false, error: "Appointment not found" };
    }

    if (appointment.visit_status === "checked_in") {
      return { success: false, error: "Patient already checked in" };
    }

    const validBookingStatuses = ["approved", "confirmed"];
    if (!validBookingStatuses.includes(appointment.booking_status)) {
      return {
        success: false,
        error: `Cannot check in: booking status is "${appointment.booking_status}". Must be approved or confirmed.`,
      };
    }

    const service = new AppointmentService(supabase);
    await service.updateAppointment(appointmentId, { visit_status: "checked_in" });

    revalidatePath("/check-in");
    revalidatePath("/queue");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to check in patient",
    };
  }
}
