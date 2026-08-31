"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { PatientService } from "@/lib/services/patient-service";
import { patientSchema } from "@/lib/validations/patient.schema";
import { extractPatientFormData } from "@/lib/utils/patient-form-data";
import type { ServiceResult } from "@/lib/services/base-service";

export async function createPatientAction(
  formData: FormData,
): Promise<ServiceResult<{ id: string }>> {
  const raw = extractPatientFormData(formData);

  const parsed = patientSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const service = new PatientService(supabase);
    const created = await service.createPatient(parsed.data);
    revalidatePath("/patients");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create patient",
    };
  }
}

export async function updatePatientAction(
  id: string,
  formData: FormData,
): Promise<ServiceResult<void>> {
  const raw = extractPatientFormData(formData);

  const parsed = patientSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const service = new PatientService(supabase);
    await service.updatePatient(id, parsed.data);
    revalidatePath("/patients");
    revalidatePath(`/patients/${id}`);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update patient",
    };
  }
}

export async function archivePatientAction(
  id: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const service = new PatientService(supabase);
    await service.archivePatient(id);
    revalidatePath("/patients");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive patient",
    };
  }
}

export async function checkDuplicatePatientAction(
  firstName: string,
  lastName: string,
  contactNo: string,
): Promise<ServiceResult<{ isDuplicate: boolean; existingPatientId: string | null }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("patients")
      .select("id")
      .eq("is_archived", false)
      .ilike("first_name", firstName)
      .ilike("last_name", lastName)
      .ilike("contact_no", contactNo)
      .limit(1)
      .maybeSingle();

    if (error) {
      return { success: false, error: "Duplicate check failed" };
    }

    return {
      success: true,
      data: {
        isDuplicate: !!data,
        existingPatientId: data?.id ?? null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Duplicate check failed",
    };
  }
}
