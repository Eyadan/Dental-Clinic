"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { DentalServiceService } from "@/lib/services";
import { dentalServiceSchema } from "@/lib/validations";
import type { ServiceResult } from "@/lib/services/base-service";

export async function createServiceAction(
  formData: FormData,
): Promise<ServiceResult<{ id: string }>> {
  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    default_duration_minutes: Number(formData.get("default_duration_minutes")),
    default_price: Number(formData.get("default_price")),
  };

  const parsed = dentalServiceSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const service = new DentalServiceService(supabase);
    const created = await service.createService(parsed.data);
    revalidatePath("/services");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create service",
    };
  }
}

export async function updateServiceAction(
  id: string,
  formData: FormData,
): Promise<ServiceResult<void>> {
  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    default_duration_minutes: Number(formData.get("default_duration_minutes")),
    default_price: Number(formData.get("default_price")),
  };

  const parsed = dentalServiceSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const service = new DentalServiceService(supabase);
    await service.updateService(id, parsed.data);
    revalidatePath("/services");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update service",
    };
  }
}

export async function toggleServiceActiveAction(
  id: string,
  isActive: boolean,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const service = new DentalServiceService(supabase);
    await service.toggleActive(id, isActive);
    revalidatePath("/services");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle service",
    };
  }
}
