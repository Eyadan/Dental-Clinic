import type { SupabaseClient } from "@supabase/supabase-js";
import type { Patient, PatientMedicalRecord, MedicalCondition } from "@/lib/types/database";
import type { PatientFormData, PatientSearchParams } from "@/lib/validations/patient.schema";
import { BaseService, type PaginatedResult } from "./base-service";
import { parseAllergies } from "@/lib/utils";

function compileAllergiesSummary(data: Partial<PatientFormData>): string | null {
  const items: string[] = [];
  if (data.allergy_local_anesthetic) items.push("Local Anesthetic (Lidocaine)");
  if (data.allergy_penicillin_antibiotics) items.push("Penicillin / Antibiotics");
  if (data.allergy_sulfa_drugs) items.push("Sulfa Drugs");
  if (data.allergy_aspirin) items.push("Aspirin");
  if (data.allergy_latex) items.push("Latex");

  if (data.allergy_others && data.allergy_others.trim() !== "") {
    items.push(...parseAllergies(data.allergy_others));
  }
  if (data.allergies && data.allergies.trim() !== "") {
    items.push(...parseAllergies(data.allergies));
  }

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  return unique.length > 0 ? unique.join(", ") : null;
}

function buildPatientColumns(data: Partial<PatientFormData>) {
  return {
    first_name: data.first_name,
    last_name: data.last_name,
    middle_name: data.middle_name || null,
    contact_no: data.contact_no,
    email: data.email || null,
    birth_date: data.birth_date || null,
    sex: data.sex || null,
    nickname: data.nickname || null,
    religion: data.religion || null,
    nationality: data.nationality || null,
    home_address: data.home_address || null,
    home_no: data.home_no || null,
    office_no: data.office_no || null,
    fax_no: data.fax_no || null,
    occupation: data.occupation || null,
    dental_insurance: data.dental_insurance || null,
    insurance_effective_date: data.insurance_effective_date || null,
    guardian_name: data.guardian_name || null,
    guardian_occupation: data.guardian_occupation || null,
    referred_by: data.referred_by || null,
    consultation_reason: data.consultation_reason || null,
    medical_history: data.medical_history || null,
    allergies: compileAllergiesSummary(data),
  };
}

function buildMedicalRecordColumns(data: Partial<PatientFormData>) {
  return {
    previous_dentist: data.previous_dentist || null,
    last_dental_visit: data.last_dental_visit || null,
    physician_name: data.physician_name || null,
    physician_specialty: data.physician_specialty || null,
    physician_office_address: data.physician_office_address || null,
    physician_office_no: data.physician_office_no || null,
    is_in_good_health: data.is_in_good_health ?? null,
    is_under_medical_treatment: data.is_under_medical_treatment ?? null,
    medical_treatment_condition: data.medical_treatment_condition || null,
    had_serious_illness_or_surgery: data.had_serious_illness_or_surgery ?? null,
    illness_or_surgery_details: data.illness_or_surgery_details || null,
    was_hospitalized: data.was_hospitalized ?? null,
    hospitalization_details: data.hospitalization_details || null,
    taking_medication: data.taking_medication ?? null,
    medication_details: data.medication_details || null,
    uses_tobacco: data.uses_tobacco ?? null,
    uses_alcohol_or_drugs: data.uses_alcohol_or_drugs ?? null,
    allergy_local_anesthetic: data.allergy_local_anesthetic ?? false,
    allergy_penicillin_antibiotics: data.allergy_penicillin_antibiotics ?? false,
    allergy_sulfa_drugs: data.allergy_sulfa_drugs ?? false,
    allergy_aspirin: data.allergy_aspirin ?? false,
    allergy_latex: data.allergy_latex ?? false,
    allergy_others: data.allergy_others || null,
    bleeding_time: data.bleeding_time || null,
    is_pregnant: data.is_pregnant ?? null,
    is_nursing: data.is_nursing ?? null,
    taking_birth_control: data.taking_birth_control ?? null,
    blood_type: data.blood_type || null,
    blood_pressure: data.blood_pressure || null,
    signed_at: data.signed_at || null,
  };
}

export class PatientService extends BaseService {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async getPatients(params: PatientSearchParams): Promise<PaginatedResult<Patient>> {
    const { query, page, pageSize } = params;
    const offset = (page - 1) * pageSize;

    const supabaseQuery = this.supabase
      .from("patients")
      .select("*", { count: "exact" })
      .eq("is_archived", false)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,contact_no.ilike.%${query}%,email.ilike.%${query}%`)
      .range(offset, offset + pageSize - 1)
      .order("created_at", { ascending: false });

    const { data, error, count } = await supabaseQuery;

    if (error) this.handleError(error);

    return {
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
      hasMore: (count ?? 0) > offset + pageSize,
    };
  }

  async getPatientById(id: string): Promise<Patient | null> {
    const { data, error } = await this.supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      this.handleError(error);
    }

    return data;
  }

  async getMedicalRecord(patientId: string): Promise<PatientMedicalRecord | null> {
    const { data, error } = await this.supabase
      .from("patient_medical_records")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (error) this.handleError(error);

    return data;
  }

  async getMedicalConditions(): Promise<MedicalCondition[]> {
    const { data, error } = await this.supabase
      .from("medical_conditions")
      .select("*")
      .order("name");

    if (error) this.handleError(error);

    return data ?? [];
  }

  async getPatientConditionIds(patientId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("patient_medical_conditions")
      .select("condition_id")
      .eq("patient_id", patientId);

    if (error) this.handleError(error);

    return (data ?? []).map((row: { condition_id: string }) => row.condition_id);
  }

  private async upsertMedicalRecord(patientId: string, data: PatientFormData): Promise<void> {
    const { error } = await this.supabase
      .from("patient_medical_records")
      .upsert(
        { patient_id: patientId, ...buildMedicalRecordColumns(data) },
        { onConflict: "patient_id" },
      );

    if (error) this.handleError(error);
  }

  private async syncConditions(patientId: string, conditionIds: string[]): Promise<void> {
    const { error: deleteError } = await this.supabase
      .from("patient_medical_conditions")
      .delete()
      .eq("patient_id", patientId);

    if (deleteError) this.handleError(deleteError);

    if (conditionIds.length === 0) return;

    const { error: insertError } = await this.supabase
      .from("patient_medical_conditions")
      .insert(conditionIds.map((conditionId) => ({ patient_id: patientId, condition_id: conditionId })));

    if (insertError) this.handleError(insertError);
  }

  async createPatient(data: PatientFormData): Promise<Patient> {
    const { data: result, error } = await this.supabase
      .from("patients")
      .insert(buildPatientColumns(data))
      .select()
      .single();

    if (error) this.handleError(error);

    await this.upsertMedicalRecord(result.id, data);
    await this.syncConditions(result.id, data.condition_ids ?? []);

    return result;
  }

  async updatePatient(id: string, data: PatientFormData): Promise<Patient> {
    const { data: result, error } = await this.supabase
      .from("patients")
      .update(buildPatientColumns(data))
      .eq("id", id)
      .select()
      .single();

    if (error) this.handleError(error);

    await this.upsertMedicalRecord(id, data);
    await this.syncConditions(id, data.condition_ids ?? []);

    return result;
  }

  async archivePatient(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("patients")
      .update({ is_archived: true })
      .eq("id", id);

    if (error) this.handleError(error);
  }
}
