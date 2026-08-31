import { z } from "zod";

const phoneRegex = /^(\+63|0)[0-9]{10}$/;
const optionalText = (max: number) => z.string().max(max).optional().or(z.literal(""));
const optionalDate = () => z.string().date().optional().or(z.literal(""));
const checkboxBoolean = () => z.boolean().optional();

export const patientSchema = z.object({
  // Patient Information Record
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  middle_name: optionalText(100),
  contact_no: z.string().min(1, "Contact number is required").regex(phoneRegex, "Invalid Philippine phone number"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  birth_date: optionalDate(),
  sex: z.enum(["M", "F"]).optional().or(z.literal("")),
  nickname: optionalText(100),
  religion: optionalText(100),
  nationality: optionalText(100),
  home_address: optionalText(500),
  home_no: optionalText(50),
  office_no: optionalText(50),
  fax_no: optionalText(50),
  occupation: optionalText(200),
  dental_insurance: optionalText(200),
  insurance_effective_date: optionalDate(),
  guardian_name: optionalText(200),
  guardian_occupation: optionalText(200),
  referred_by: optionalText(200),
  consultation_reason: optionalText(1000),
  medical_history: optionalText(2000),
  allergies: optionalText(500),

  // Dental History
  previous_dentist: optionalText(200),
  last_dental_visit: optionalDate(),

  // Medical History — Physician
  physician_name: optionalText(200),
  physician_specialty: optionalText(200),
  physician_office_address: optionalText(500),
  physician_office_no: optionalText(50),

  // Medical History — Screening Questions
  is_in_good_health: checkboxBoolean(),
  is_under_medical_treatment: checkboxBoolean(),
  medical_treatment_condition: optionalText(1000),
  had_serious_illness_or_surgery: checkboxBoolean(),
  illness_or_surgery_details: optionalText(1000),
  was_hospitalized: checkboxBoolean(),
  hospitalization_details: optionalText(1000),
  taking_medication: checkboxBoolean(),
  medication_details: optionalText(1000),
  uses_tobacco: checkboxBoolean(),
  uses_alcohol_or_drugs: checkboxBoolean(),

  // Allergies checklist
  allergy_local_anesthetic: checkboxBoolean(),
  allergy_penicillin_antibiotics: checkboxBoolean(),
  allergy_sulfa_drugs: checkboxBoolean(),
  allergy_aspirin: checkboxBoolean(),
  allergy_latex: checkboxBoolean(),
  allergy_others: optionalText(200),

  bleeding_time: optionalText(100),
  is_pregnant: checkboxBoolean(),
  is_nursing: checkboxBoolean(),
  taking_birth_control: checkboxBoolean(),
  blood_type: optionalText(10),
  blood_pressure: optionalText(20),
  signed_at: optionalDate(),

  // Medical conditions checklist (medical_conditions.id values)
  condition_ids: z.array(z.string().uuid()).optional(),
});

export type PatientFormData = z.infer<typeof patientSchema>;

export const patientSearchSchema = z.object({
  query: z.string().min(1).max(100),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type PatientSearchParams = z.infer<typeof patientSearchSchema>;
