"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { WaitlistService } from "@/lib/services/waitlist-service";
import { sendNotification } from "@/lib/services/notification-service";
import type { ServiceResult } from "@/lib/services/base-service";
import type { WaitlistEntryWithPatient, ReleasedSlot } from "@/lib/services/waitlist-service";

export async function getWaitlistAction(date?: string): Promise<ServiceResult<WaitlistEntryWithPatient[]>> {
  try {
    const service = new WaitlistService();
    const entries = await service.getWaitlist(date);
    return { success: true, data: entries };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch waitlist",
    };
  }
}

export async function getReleasedSlotsAction(date: string): Promise<ServiceResult<ReleasedSlot[]>> {
  try {
    const service = new WaitlistService();
    const slots = await service.findReleasedSlots(date);
    return { success: true, data: slots };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch released slots",
    };
  }
}

export async function joinWaitlistAction(
  patientId: string,
  requestedDate: string,
): Promise<ServiceResult<void>> {
  try {
    const service = new WaitlistService();
    await service.joinWaitlist(patientId, requestedDate);
    revalidatePath("/waitlist");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to join waitlist",
    };
  }
}

export async function leaveWaitlistAction(entryId: string): Promise<ServiceResult<void>> {
  try {
    const service = new WaitlistService();
    await service.leaveWaitlist(entryId);
    revalidatePath("/waitlist");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to leave waitlist",
    };
  }
}

export async function notifyNextAction(
  dentistId: string,
  date: string,
  time: string,
  duration: number,
): Promise<ServiceResult<WaitlistEntryWithPatient | null>> {
  try {
    const service = new WaitlistService();
    const entry = await service.notifyNextInLine(dentistId, date, time, duration);

    if (entry?.patient_psid) {
      await sendNotification({
        type: "custom",
        patientPsid: entry.patient_psid,
        customMessage: `🔔 A slot just opened up!\n\nDate: ${date}\nTime: ${time}\n\nReply "Accept" to claim this slot or "Decline" to pass.`,
      });
    }

    revalidatePath("/waitlist");
    return { success: true, data: entry };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to notify next patient",
    };
  }
}

export async function acceptWaitlistSlotAction(
  entryId: string,
  dentistId: string,
  date: string,
  time: string,
  serviceId: string,
): Promise<ServiceResult<{ referenceNo: string }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const waitlistService = new WaitlistService();
    const result = await waitlistService.acceptWaitlistSlot(
      entryId,
      dentistId,
      date,
      time,
      serviceId,
      user.id,
    );

    const { data: entry } = await supabase
      .from("waitlist_entries")
      .select("patient_id")
      .eq("id", entryId)
      .single();

    revalidatePath("/waitlist");
    revalidatePath("/appointments");
    return { success: true, data: { referenceNo: result.referenceNo } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to accept waitlist slot",
    };
  }
}

export async function declineWaitlistAction(entryId: string): Promise<ServiceResult<void>> {
  try {
    const service = new WaitlistService();
    await service.declineWaitlistSlot(entryId);
    revalidatePath("/waitlist");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to decline waitlist slot",
    };
  }
}

export async function getPatientsAction(): Promise<ServiceResult<{ id: string; name: string }[]>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("patients")
      .select("id, first_name, last_name")
      .eq("is_archived", false)
      .order("first_name");

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: (data ?? []).map((p) => ({ id: p.id, name: `${p.first_name} ${p.last_name}` })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch patients",
    };
  }
}

export async function getServicesAction(): Promise<ServiceResult<{ id: string; name: string }[]>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("dental_services")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: data ?? [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch services",
    };
  }
}
