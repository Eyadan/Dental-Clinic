"use server";

import { createClient } from "@supabase/supabase-js";
import { QrCodeService } from "@/lib/services/qr-code-service";
import { PatientService } from "@/lib/services/patient-service";
import { patientSchema } from "@/lib/validations/patient.schema";
import type { ServiceResult } from "@/lib/services/base-service";
import type { MedicalCondition } from "@/lib/types/database";

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

    const conditionIds = formData.getAll("condition_ids").filter((v) => v !== "") as string[];

    const raw: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      if (key === "condition_ids") continue;
      const strValue = value as string;
      if (strValue === "true") {
        raw[key] = true;
      } else if (strValue === "false") {
        raw[key] = false;
      } else {
        raw[key] = strValue;
      }
    }
    raw.condition_ids = conditionIds;

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
          middle_name: parsed.data.middle_name || null,
          contact_no: parsed.data.contact_no,
          email: parsed.data.email || null,
          birth_date: parsed.data.birth_date || null,
          sex: parsed.data.sex || null,
          nickname: parsed.data.nickname || null,
          religion: parsed.data.religion || null,
          nationality: parsed.data.nationality || null,
          home_address: parsed.data.home_address || null,
          home_no: parsed.data.home_no || null,
          office_no: parsed.data.office_no || null,
          fax_no: parsed.data.fax_no || null,
          occupation: parsed.data.occupation || null,
          dental_insurance: parsed.data.dental_insurance || null,
          insurance_effective_date: parsed.data.insurance_effective_date || null,
          guardian_name: parsed.data.guardian_name || null,
          guardian_occupation: parsed.data.guardian_occupation || null,
          referred_by: parsed.data.referred_by || null,
          consultation_reason: parsed.data.consultation_reason || null,
          medical_history: parsed.data.medical_history || null,
          allergies: parsed.data.allergies || null,
        })
        .eq("id", existingPatientId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      const { data: existingRecord } = await supabase
        .from("patient_medical_records")
        .select("id")
        .eq("patient_id", existingPatientId)
        .maybeSingle();

      const recordData = {
        patient_id: existingPatientId,
        previous_dentist: parsed.data.previous_dentist || null,
        last_dental_visit: parsed.data.last_dental_visit || null,
        physician_name: parsed.data.physician_name || null,
        physician_specialty: parsed.data.physician_specialty || null,
        physician_office_address: parsed.data.physician_office_address || null,
        physician_office_no: parsed.data.physician_office_no || null,
        is_in_good_health: parsed.data.is_in_good_health ?? false,
        is_under_medical_treatment: parsed.data.is_under_medical_treatment ?? false,
        medical_treatment_condition: parsed.data.medical_treatment_condition || null,
        had_serious_illness_or_surgery: parsed.data.had_serious_illness_or_surgery ?? false,
        illness_or_surgery_details: parsed.data.illness_or_surgery_details || null,
        was_hospitalized: parsed.data.was_hospitalized ?? false,
        hospitalization_details: parsed.data.hospitalization_details || null,
        taking_medication: parsed.data.taking_medication ?? false,
        medication_details: parsed.data.medication_details || null,
        uses_tobacco: parsed.data.uses_tobacco ?? false,
        uses_alcohol_or_drugs: parsed.data.uses_alcohol_or_drugs ?? false,
        allergy_local_anesthetic: parsed.data.allergy_local_anesthetic ?? false,
        allergy_penicillin_antibiotics: parsed.data.allergy_penicillin_antibiotics ?? false,
        allergy_sulfa_drugs: parsed.data.allergy_sulfa_drugs ?? false,
        allergy_aspirin: parsed.data.allergy_aspirin ?? false,
        allergy_latex: parsed.data.allergy_latex ?? false,
        allergy_others: parsed.data.allergy_others || null,
        bleeding_time: parsed.data.bleeding_time || null,
        is_pregnant: parsed.data.is_pregnant ?? false,
        is_nursing: parsed.data.is_nursing ?? false,
        taking_birth_control: parsed.data.taking_birth_control ?? false,
        blood_type: parsed.data.blood_type || null,
        blood_pressure: parsed.data.blood_pressure || null,
      };

      if (existingRecord) {
        await supabase.from("patient_medical_records").update(recordData).eq("id", existingRecord.id);
      } else {
        await supabase.from("patient_medical_records").insert(recordData);
      }

      if (conditionIds.length > 0) {
        await supabase
          .from("patient_medical_conditions")
          .delete()
          .eq("patient_id", existingPatientId);
        await supabase
          .from("patient_medical_conditions")
          .insert(conditionIds.map((id) => ({ patient_id: existingPatientId, condition_id: id })));
      }

      await qrService.invalidateToken(token);
      return { success: true, data: { patientId: existingPatientId } };
    }

    const patientService = new PatientService(supabase);
    const patient = await patientService.createPatient({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      middle_name: parsed.data.middle_name || undefined,
      contact_no: parsed.data.contact_no,
      email: parsed.data.email || undefined,
      birth_date: parsed.data.birth_date || undefined,
      sex: parsed.data.sex || undefined,
      nickname: parsed.data.nickname || undefined,
      religion: parsed.data.religion || undefined,
      nationality: parsed.data.nationality || undefined,
      home_address: parsed.data.home_address || undefined,
      home_no: parsed.data.home_no || undefined,
      office_no: parsed.data.office_no || undefined,
      fax_no: parsed.data.fax_no || undefined,
      occupation: parsed.data.occupation || undefined,
      dental_insurance: parsed.data.dental_insurance || undefined,
      insurance_effective_date: parsed.data.insurance_effective_date || undefined,
      guardian_name: parsed.data.guardian_name || undefined,
      guardian_occupation: parsed.data.guardian_occupation || undefined,
      referred_by: parsed.data.referred_by || undefined,
      consultation_reason: parsed.data.consultation_reason || undefined,
      medical_history: parsed.data.medical_history || undefined,
      allergies: parsed.data.allergies || undefined,
      previous_dentist: parsed.data.previous_dentist || undefined,
      last_dental_visit: parsed.data.last_dental_visit || undefined,
      physician_name: parsed.data.physician_name || undefined,
      physician_specialty: parsed.data.physician_specialty || undefined,
      physician_office_address: parsed.data.physician_office_address || undefined,
      physician_office_no: parsed.data.physician_office_no || undefined,
      is_in_good_health: parsed.data.is_in_good_health ?? undefined,
      is_under_medical_treatment: parsed.data.is_under_medical_treatment ?? undefined,
      medical_treatment_condition: parsed.data.medical_treatment_condition || undefined,
      had_serious_illness_or_surgery: parsed.data.had_serious_illness_or_surgery ?? undefined,
      illness_or_surgery_details: parsed.data.illness_or_surgery_details || undefined,
      was_hospitalized: parsed.data.was_hospitalized ?? undefined,
      hospitalization_details: parsed.data.hospitalization_details || undefined,
      taking_medication: parsed.data.taking_medication ?? undefined,
      medication_details: parsed.data.medication_details || undefined,
      uses_tobacco: parsed.data.uses_tobacco ?? undefined,
      uses_alcohol_or_drugs: parsed.data.uses_alcohol_or_drugs ?? undefined,
      allergy_local_anesthetic: parsed.data.allergy_local_anesthetic ?? undefined,
      allergy_penicillin_antibiotics: parsed.data.allergy_penicillin_antibiotics ?? undefined,
      allergy_sulfa_drugs: parsed.data.allergy_sulfa_drugs ?? undefined,
      allergy_aspirin: parsed.data.allergy_aspirin ?? undefined,
      allergy_latex: parsed.data.allergy_latex ?? undefined,
      allergy_others: parsed.data.allergy_others || undefined,
      bleeding_time: parsed.data.bleeding_time || undefined,
      is_pregnant: parsed.data.is_pregnant ?? undefined,
      is_nursing: parsed.data.is_nursing ?? undefined,
      taking_birth_control: parsed.data.taking_birth_control ?? undefined,
      blood_type: parsed.data.blood_type || undefined,
      blood_pressure: parsed.data.blood_pressure || undefined,
      condition_ids: conditionIds,
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

export async function getMedicalConditionsAction(): Promise<ServiceResult<MedicalCondition[]>> {
  try {
    const supabase = getPublicServiceClient();
    const patientService = new PatientService(supabase);
    const conditions = await patientService.getMedicalConditions();
    return { success: true, data: conditions };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load medical conditions",
    };
  }
}
