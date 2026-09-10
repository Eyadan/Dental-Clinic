"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { revalidatePath } from "next/cache";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import type { PrescriptionData, PrescriptionItemData, ServiceResult } from "./rx-types";

export async function createPrescriptionAction(
  appointmentId: string,
  patientId: string,
  ptrNo: string | undefined,
  s2LicenseNo: string | undefined,
  notes: string | undefined,
  items: Omit<PrescriptionItemData, "id">[],
): Promise<ServiceResult<PrescriptionData>> {
  try {
    if (!items || items.length === 0) {
      return { success: false, error: "At least one medication item is required for a prescription." };
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Generate unique Prescription Reference Number: RX-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const prescriptionNo = `RX-${dateStr}-${randomSuffix}`;

    const { data: prescription, error: rxError } = await supabase
      .from("prescriptions")
      .insert({
        appointment_id: appointmentId,
        patient_id: patientId,
        dentist_id: user.id,
        prescription_no: prescriptionNo,
        ptr_no: ptrNo?.trim() || null,
        s2_license_no: s2LicenseNo?.trim() || null,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (rxError || !prescription) {
      return { success: false, error: `Failed to save prescription: ${rxError?.message ?? "Unknown error"}` };
    }

    // Insert Line Items
    const itemPayloads = items.map((item) => ({
      prescription_id: prescription.id,
      medication_name: item.medicationName,
      generic_name: item.genericName || null,
      dosage: item.dosage,
      duration: item.duration,
      quantity: item.quantity || 1,
      instructions: item.instructions || null,
    }));

    const { error: itemsError } = await supabase
      .from("prescription_items")
      .insert(itemPayloads);

    if (itemsError) {
      return { success: false, error: `Failed to save prescription items: ${itemsError.message}` };
    }

    revalidatePath(`/consultation/${appointmentId}`);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create prescription",
    };
  }
}

export async function getPrescriptionsByAppointmentAction(
  appointmentId: string,
): Promise<ServiceResult<PrescriptionData[]>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: records, error } = await supabase
      .from("prescriptions")
      .select(`
        id,
        appointment_id,
        patient_id,
        dentist_id,
        prescription_no,
        ptr_no,
        s2_license_no,
        clinic_name,
        clinic_address,
        clinic_contact,
        notes,
        created_at,
        patients(first_name, last_name, birth_date, contact_no),
        users!prescriptions_dentist_id_fkey(first_name, last_name),
        prescription_items(
          id,
          medication_name,
          generic_name,
          dosage,
          duration,
          quantity,
          instructions
        )
      `)
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const result: PrescriptionData[] = (records ?? []).map((rx: Record<string, unknown>) => {
      const patient = getSingleJoined<{ first_name: string; last_name: string; birth_date: string | null; contact_no: string | null }>(rx.patients);
      const dentist = getSingleJoined<{ first_name: string; last_name: string }>(rx.users);

      const rawItems = rx.prescription_items as unknown as Array<{
        id: string;
        medication_name: string;
        generic_name: string | null;
        dosage: string;
        duration: string;
        quantity: number;
        instructions: string | null;
      }> | null;

      const items: PrescriptionItemData[] = (rawItems ?? []).map((i) => ({
        id: i.id,
        medicationName: i.medication_name,
        genericName: i.generic_name ?? undefined,
        dosage: i.dosage,
        duration: i.duration,
        quantity: i.quantity,
        instructions: i.instructions ?? undefined,
      }));

      return {
        id: rx.id as string,
        appointmentId: rx.appointment_id as string | null,
        patientId: rx.patient_id as string,
        dentistId: rx.dentist_id as string,
        prescriptionNo: rx.prescription_no as string,
        ptrNo: rx.ptr_no as string | null,
        s2LicenseNo: rx.s2_license_no as string | null,
        clinicName: (rx.clinic_name as string) || "Smile Dental Clinic",
        clinicAddress: (rx.clinic_address as string) || "123 Healthcare Way, Suite 400",
        clinicContact: (rx.clinic_contact as string) || "+63 917 123 4567",
        notes: rx.notes as string | null,
        createdAt: rx.created_at as string,
        patientName: patient ? `${patient.first_name} ${patient.last_name}` : "Patient",
        patientAddress: patient?.contact_no ?? undefined,
        dentistName: dentist ? `Dr. ${dentist.first_name} ${dentist.last_name}` : "Attending Dentist",
        items,
      };
    });

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch prescriptions",
    };
  }
}

export async function deletePrescriptionAction(
  prescriptionId: string,
  appointmentId: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("prescriptions").delete().eq("id", prescriptionId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/consultation/${appointmentId}`);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete prescription",
    };
  }
}
