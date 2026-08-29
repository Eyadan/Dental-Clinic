"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { SchedulingService } from "@/lib/services/scheduling-service";
import { appointmentCreateSchema } from "@/lib/validations/appointment.schema";
import type { ServiceResult } from "@/lib/services/base-service";

export async function createWalkInAction(
  formData: FormData,
): Promise<ServiceResult<{ id: string; reference_no: string }>> {
  const raw = {
    patient_id: formData.get("patient_id") as string,
    dentist_id: formData.get("dentist_id") as string,
    scheduled_date: formData.get("scheduled_date") as string,
    scheduled_time: formData.get("scheduled_time") as string,
    total_duration: Number(formData.get("total_duration")),
    service_ids: (formData.getAll("service_ids") as string[]).filter(Boolean),
  };

  const parsed = appointmentCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const schedulingService = new SchedulingService(supabase);

    const conflict = await schedulingService.checkConflict(
      parsed.data.dentist_id,
      parsed.data.scheduled_date,
      parsed.data.scheduled_time,
      parsed.data.total_duration,
    );

    if (conflict.hasConflict) {
      return {
        success: false,
        error: `Scheduling conflict: ${conflict.reason}`,
      };
    }

    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .insert({
        patient_id: parsed.data.patient_id,
        dentist_id: parsed.data.dentist_id,
        scheduled_date: parsed.data.scheduled_date,
        scheduled_time: parsed.data.scheduled_time,
        total_duration: parsed.data.total_duration,
        booking_status: "approved",
        visit_status: "checked_in",
        payment_status: "pending_payment",
      })
      .select()
      .single();

    if (apptError) {
      return { success: false, error: apptError.message };
    }

    if (parsed.data.service_ids.length > 0) {
      const serviceRows = parsed.data.service_ids.map((service_id) => ({
        appointment_id: appointment.id,
        service_id,
      }));

      const { error: svcError } = await supabase
        .from("appointment_services")
        .insert(serviceRows);

      if (svcError) {
        return { success: false, error: svcError.message };
      }
    }

    revalidatePath("/appointments");
    revalidatePath("/queue");
    return { success: true, data: { id: appointment.id, reference_no: appointment.reference_no } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create walk-in",
    };
  }
}
