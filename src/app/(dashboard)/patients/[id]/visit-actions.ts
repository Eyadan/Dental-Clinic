"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import type { ServiceResult } from "@/lib/services/base-service";

export interface PatientVisitItem {
  appointmentId: string;
  referenceNo: string;
  scheduledDate: string;
  scheduledTime: string;
  totalDuration: number;
  bookingStatus: string;
  visitStatus: string | null;
  dentistName: string;
  services: { name: string }[];
  treatmentRecord: {
    diagnosis: string | null;
    procedures: string | null;
    clinicalNotes: string | null;
  } | null;
  consentSigned: boolean;
}

export async function getPatientVisitHistoryAction(
  patientId: string,
): Promise<ServiceResult<PatientVisitItem[]>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        id,
        reference_no,
        scheduled_date,
        scheduled_time,
        total_duration,
        booking_status,
        visit_status,
        dentists(users(first_name, last_name)),
        appointment_services(dental_services(name)),
        treatment_records(diagnosis, procedures, clinical_notes),
        consent_forms(signed_at)
      `)
      .eq("patient_id", patientId)
      .order("scheduled_date", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const items: PatientVisitItem[] = (appointments ?? []).map((appt) => {
      const dentist = getSingleJoined<{ users: unknown }>(
        (appt as unknown as Record<string, unknown>).dentists,
      );
      const dentistUser = dentist
        ? getSingleJoined<{ first_name: string; last_name: string }>(dentist.users)
        : null;

      const rawServices = ((appt as unknown as Record<string, unknown>).appointment_services ?? []) as Array<{
        dental_services: { name: string } | null;
      }>;
      const services = rawServices.map((item) => ({
        name: item.dental_services?.name ?? "Unknown Service",
      }));

      const treatmentRecords = (appt as unknown as Record<string, unknown>).treatment_records;
      const treatmentRecord = treatmentRecords
        ? getSingleJoined<{ diagnosis: string | null; procedures: string | null; clinical_notes: string | null }>(treatmentRecords)
        : null;

      const consentForms = (appt as unknown as Record<string, unknown>).consent_forms;
      const consentForm = consentForms
        ? getSingleJoined<{ signed_at: string | null }>(consentForms)
        : null;

      return {
        appointmentId: appt.id as string,
        referenceNo: appt.reference_no as string,
        scheduledDate: appt.scheduled_date as string,
        scheduledTime: (appt.scheduled_time as string)?.slice(0, 5) ?? "",
        totalDuration: appt.total_duration as number,
        bookingStatus: appt.booking_status as string,
        visitStatus: appt.visit_status as string | null,
        dentistName: dentistUser
          ? `${dentistUser.first_name} ${dentistUser.last_name}`
          : "Unknown",
        services,
        treatmentRecord: treatmentRecord
          ? {
              diagnosis: treatmentRecord.diagnosis,
              procedures: treatmentRecord.procedures,
              clinicalNotes: treatmentRecord.clinical_notes,
            }
          : null,
        consentSigned: consentForm?.signed_at != null,
      };
    });

    return { success: true, data: items };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load visit history",
    };
  }
}
