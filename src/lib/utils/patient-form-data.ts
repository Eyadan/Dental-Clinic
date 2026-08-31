import type { PatientFormData } from "@/lib/validations/patient.schema";

const TEXT_FIELDS: (keyof PatientFormData)[] = [
  "first_name", "last_name", "middle_name", "contact_no", "email", "birth_date",
  "sex", "nickname", "religion", "nationality", "home_address", "home_no",
  "office_no", "fax_no", "occupation", "dental_insurance", "insurance_effective_date",
  "guardian_name", "guardian_occupation", "referred_by", "consultation_reason",
  "medical_history", "allergies", "previous_dentist", "last_dental_visit",
  "physician_name", "physician_specialty", "physician_office_address", "physician_office_no",
  "medical_treatment_condition", "illness_or_surgery_details", "hospitalization_details",
  "medication_details", "allergy_others", "bleeding_time", "blood_type",
  "blood_pressure", "signed_at",
];

const BOOLEAN_FIELDS: (keyof PatientFormData)[] = [
  "is_in_good_health", "is_under_medical_treatment", "had_serious_illness_or_surgery",
  "was_hospitalized", "taking_medication", "uses_tobacco", "uses_alcohol_or_drugs",
  "allergy_local_anesthetic", "allergy_penicillin_antibiotics", "allergy_sulfa_drugs",
  "allergy_aspirin", "allergy_latex", "is_pregnant", "is_nursing", "taking_birth_control",
];

/** Extracts and normalises the full patient form payload from a FormData object. */
export function extractPatientFormData(formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};

  for (const field of TEXT_FIELDS) {
    raw[field] = (formData.get(field) as string) || "";
  }

  for (const field of BOOLEAN_FIELDS) {
    raw[field] = formData.get(field) === "true" || formData.get(field) === "on";
  }

  raw.condition_ids = formData.getAll("condition_ids").map(String);

  return raw;
}
