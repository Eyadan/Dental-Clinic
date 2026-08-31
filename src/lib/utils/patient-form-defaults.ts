import type { PatientFormData } from "@/lib/validations/patient.schema";
import type { Patient, PatientMedicalRecord } from "@/lib/types/database";

/** Builds react-hook-form defaultValues from an existing patient + medical record + selected condition IDs. */
export function buildPatientFormDefaults(
  patient?: Patient | null,
  record?: PatientMedicalRecord | null,
  conditionIds: string[] = [],
): PatientFormData {
  return {
    first_name: patient?.first_name ?? "",
    last_name: patient?.last_name ?? "",
    middle_name: patient?.middle_name ?? "",
    contact_no: patient?.contact_no ?? "",
    email: patient?.email ?? "",
    birth_date: patient?.birth_date ?? "",
    sex: patient?.sex ?? "",
    nickname: patient?.nickname ?? "",
    religion: patient?.religion ?? "",
    nationality: patient?.nationality ?? "",
    home_address: patient?.home_address ?? "",
    home_no: patient?.home_no ?? "",
    office_no: patient?.office_no ?? "",
    fax_no: patient?.fax_no ?? "",
    occupation: patient?.occupation ?? "",
    dental_insurance: patient?.dental_insurance ?? "",
    insurance_effective_date: patient?.insurance_effective_date ?? "",
    guardian_name: patient?.guardian_name ?? "",
    guardian_occupation: patient?.guardian_occupation ?? "",
    referred_by: patient?.referred_by ?? "",
    consultation_reason: patient?.consultation_reason ?? "",
    medical_history: patient?.medical_history ?? "",
    allergies: patient?.allergies ?? "",

    previous_dentist: record?.previous_dentist ?? "",
    last_dental_visit: record?.last_dental_visit ?? "",
    physician_name: record?.physician_name ?? "",
    physician_specialty: record?.physician_specialty ?? "",
    physician_office_address: record?.physician_office_address ?? "",
    physician_office_no: record?.physician_office_no ?? "",
    is_in_good_health: record?.is_in_good_health ?? false,
    is_under_medical_treatment: record?.is_under_medical_treatment ?? false,
    medical_treatment_condition: record?.medical_treatment_condition ?? "",
    had_serious_illness_or_surgery: record?.had_serious_illness_or_surgery ?? false,
    illness_or_surgery_details: record?.illness_or_surgery_details ?? "",
    was_hospitalized: record?.was_hospitalized ?? false,
    hospitalization_details: record?.hospitalization_details ?? "",
    taking_medication: record?.taking_medication ?? false,
    medication_details: record?.medication_details ?? "",
    uses_tobacco: record?.uses_tobacco ?? false,
    uses_alcohol_or_drugs: record?.uses_alcohol_or_drugs ?? false,
    allergy_local_anesthetic: record?.allergy_local_anesthetic ?? false,
    allergy_penicillin_antibiotics: record?.allergy_penicillin_antibiotics ?? false,
    allergy_sulfa_drugs: record?.allergy_sulfa_drugs ?? false,
    allergy_aspirin: record?.allergy_aspirin ?? false,
    allergy_latex: record?.allergy_latex ?? false,
    allergy_others: record?.allergy_others ?? "",
    bleeding_time: record?.bleeding_time ?? "",
    is_pregnant: record?.is_pregnant ?? false,
    is_nursing: record?.is_nursing ?? false,
    taking_birth_control: record?.taking_birth_control ?? false,
    blood_type: record?.blood_type ?? "",
    blood_pressure: record?.blood_pressure ?? "",
    signed_at: record?.signed_at ?? "",
    condition_ids: conditionIds,
  };
}

/** Serialises PatientFormData into a FormData payload for server action submission. */
export function appendPatientFormData(data: PatientFormData): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(data)) {
    if (key === "condition_ids") continue;
    if (typeof value === "boolean") {
      formData.set(key, value ? "true" : "false");
    } else {
      formData.set(key, (value as string) ?? "");
    }
  }

  for (const conditionId of data.condition_ids ?? []) {
    formData.append("condition_ids", conditionId);
  }

  return formData;
}
