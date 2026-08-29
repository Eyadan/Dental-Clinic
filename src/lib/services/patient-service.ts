import type { SupabaseClient } from "@supabase/supabase-js";
import type { Patient } from "@/lib/types/database";
import type { PatientFormData, PatientSearchParams } from "@/lib/validations/patient.schema";
import { BaseService, type PaginatedResult } from "./base-service";

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

  async createPatient(data: PatientFormData): Promise<Patient> {
    const { data: result, error } = await this.supabase
      .from("patients")
      .insert({
        first_name: data.first_name,
        last_name: data.last_name,
        contact_no: data.contact_no,
        email: data.email || null,
        birth_date: data.birth_date || null,
        medical_history: data.medical_history || null,
        allergies: data.allergies || null,
      })
      .select()
      .single();

    if (error) this.handleError(error);

    return result;
  }

  async updatePatient(id: string, data: Partial<PatientFormData>): Promise<Patient> {
    const { data: result, error } = await this.supabase
      .from("patients")
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        contact_no: data.contact_no,
        email: data.email || null,
        birth_date: data.birth_date || null,
        medical_history: data.medical_history || null,
        allergies: data.allergies || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) this.handleError(error);

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
