"use server";

import { createClient } from "@supabase/supabase-js";
import { QrCodeService } from "@/lib/services/qr-code-service";
import { PatientService } from "@/lib/services/patient-service";
import { patientSchema } from "@/lib/validations/patient.schema";
import type { ServiceResult } from "@/lib/services/base-service";

function getPublicServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for public registration");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function validateTokenAction(
  token: string,
): Promise<ServiceResult<{ appointmentId: string; patientName: string | null }>> {
  try {
    const supabase = getPublicServiceClient();
    const qrService = new QrCodeService(supabase);

    const { valid, qrCode } = await qrService.validateToken(token);
    if (!valid || !qrCode) {
      return { success: false, error: "Invalid or expired QR code" };
    }

    const { data: appointment } = await supabase
      .from("appointments")
      .select("patient_id, patients(first_name, last_name)")
      .eq("id", qrCode.appointment_id)
      .single();

    const patient = appointment?.patients as unknown as { first_name: string; last_name: string } | null;
    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : null;

    return {
      success: true,
      data: { appointmentId: qrCode.appointment_id, patientName },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Token validation failed",
    };
  }
}

export async function submitRegistrationAction(
  token: string,
  formData: FormData,
): Promise<ServiceResult<{ patientId: string }>> {
  try {
    const supabase = getPublicServiceClient();
    const qrService = new QrCodeService(supabase);

    const { valid, qrCode } = await qrService.validateToken(token);
    if (!valid || !qrCode) {
      return { success: false, error: "Invalid or expired QR code" };
    }

    const raw = {
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      contact_no: formData.get("contact_no") as string,
      email: (formData.get("email") as string) ?? "",
      birth_date: (formData.get("birth_date") as string) ?? "",
      medical_history: (formData.get("medical_history") as string) ?? "",
      allergies: (formData.get("allergies") as string) ?? "",
    };

    const parsed = patientSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    const { data: appointment } = await supabase
      .from("appointments")
      .select("patient_id")
      .eq("id", qrCode.appointment_id)
      .single();

    const existingPatientId = appointment?.patient_id;

    if (existingPatientId) {
      const { error: updateError } = await supabase
        .from("patients")
        .update({
          first_name: parsed.data.first_name,
          last_name: parsed.data.last_name,
          contact_no: parsed.data.contact_no,
          email: parsed.data.email || null,
          birth_date: parsed.data.birth_date || null,
          medical_history: parsed.data.medical_history || null,
          allergies: parsed.data.allergies || null,
        })
        .eq("id", existingPatientId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      await qrService.invalidateToken(token);
      return { success: true, data: { patientId: existingPatientId } };
    }

    const patientService = new PatientService(supabase);
    const patient = await patientService.createPatient({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      contact_no: parsed.data.contact_no,
      email: parsed.data.email || undefined,
      birth_date: parsed.data.birth_date || undefined,
      medical_history: parsed.data.medical_history || undefined,
      allergies: parsed.data.allergies || undefined,
    });

    await supabase
      .from("appointments")
      .update({ patient_id: patient.id })
      .eq("id", qrCode.appointment_id);

    await qrService.invalidateToken(token);

    return { success: true, data: { patientId: patient.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Registration failed",
    };
  }
}
