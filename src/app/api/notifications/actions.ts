"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import {
  sendNotification,
  createStaffNotification,
  type NotificationPayload,
  type SendResult,
} from "@/lib/services/notification-service";
import type { ServiceResult } from "@/lib/services/base-service";

async function getPatientPsid(patientId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("patients")
    .select("messenger_psid")
    .eq("id", patientId)
    .maybeSingle();

  return data?.messenger_psid ?? null;
}

async function getAppointmentDetails(appointmentId: string): Promise<{
  patientId: string;
  referenceNo: string;
  date: string;
  time: string;
  dentistName: string;
} | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("appointments")
    .select(`
      id,
      patient_id,
      reference_no,
      scheduled_date,
      scheduled_time,
      dentists(
        users(first_name, last_name)
      )
    `)
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !data) return null;

  const dentist = Array.isArray(data.dentists) ? data.dentists[0] : data.dentists;
  const dentistUser = dentist
    ? (Array.isArray(dentist.users) ? dentist.users[0] : dentist.users)
    : null;

  return {
    patientId: data.patient_id,
    referenceNo: data.reference_no,
    date: data.scheduled_date,
    time: data.scheduled_time,
    dentistName: dentistUser
      ? `${dentistUser.first_name} ${dentistUser.last_name}`
      : "TBD",
  };
}

export async function sendApprovalNotificationAction(
  appointmentId: string,
): Promise<ServiceResult<SendResult>> {
  try {
    const details = await getAppointmentDetails(appointmentId);
    if (!details) {
      return { success: false, error: "Appointment not found" };
    }

    const psid = await getPatientPsid(details.patientId);
    if (!psid) {
      return {
        success: false,
        error: "Patient has no Messenger PSID — cannot send notification",
      };
    }

    const payload: NotificationPayload = {
      type: "approval",
      patientPsid: psid,
      appointmentReference: details.referenceNo,
      date: details.date,
      time: details.time,
      dentistName: details.dentistName,
    };

    const result = await sendNotification(payload);
    if (!result.success) {
      await createStaffNotification(psid, "approval", result.error ?? "Unknown error");
    }
    return { success: result.success, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send notification",
    };
  }
}

export async function sendDeclineNotificationAction(
  appointmentId: string,
  reason: string,
): Promise<ServiceResult<SendResult>> {
  try {
    const details = await getAppointmentDetails(appointmentId);
    if (!details) {
      return { success: false, error: "Appointment not found" };
    }

    const psid = await getPatientPsid(details.patientId);
    if (!psid) {
      return {
        success: false,
        error: "Patient has no Messenger PSID — cannot send notification",
      };
    }

    const payload: NotificationPayload = {
      type: "decline",
      patientPsid: psid,
      appointmentReference: details.referenceNo,
      reason,
    };

    const result = await sendNotification(payload);
    if (!result.success) {
      await createStaffNotification(psid, "decline", result.error ?? "Unknown error");
    }
    return { success: result.success, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send notification",
    };
  }
}

export async function sendCancellationNotificationAction(
  appointmentId: string,
  reason?: string,
): Promise<ServiceResult<SendResult>> {
  try {
    const details = await getAppointmentDetails(appointmentId);
    if (!details) {
      return { success: false, error: "Appointment not found" };
    }

    const psid = await getPatientPsid(details.patientId);
    if (!psid) {
      return {
        success: false,
        error: "Patient has no Messenger PSID — cannot send notification",
      };
    }

    const payload: NotificationPayload = {
      type: "cancellation",
      patientPsid: psid,
      appointmentReference: details.referenceNo,
      reason,
    };

    const result = await sendNotification(payload);
    if (!result.success) {
      await createStaffNotification(psid, "cancellation", result.error ?? "Unknown error");
    }
    return { success: result.success, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send notification",
    };
  }
}

export async function sendRescheduleNotificationAction(
  appointmentId: string,
  newDate: string,
  newTime: string,
): Promise<ServiceResult<SendResult>> {
  try {
    const details = await getAppointmentDetails(appointmentId);
    if (!details) {
      return { success: false, error: "Appointment not found" };
    }

    const psid = await getPatientPsid(details.patientId);
    if (!psid) {
      return {
        success: false,
        error: "Patient has no Messenger PSID — cannot send notification",
      };
    }

    const payload: NotificationPayload = {
      type: "reschedule",
      patientPsid: psid,
      appointmentReference: details.referenceNo,
      date: newDate,
      time: newTime,
      dentistName: details.dentistName,
    };

    const result = await sendNotification(payload);
    if (!result.success) {
      await createStaffNotification(psid, "reschedule", result.error ?? "Unknown error");
    }
    return { success: result.success, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send notification",
    };
  }
}

export async function sendFollowUpNotificationAction(
  appointmentId: string,
): Promise<ServiceResult<SendResult>> {
  try {
    const details = await getAppointmentDetails(appointmentId);
    if (!details) {
      return { success: false, error: "Appointment not found" };
    }

    const psid = await getPatientPsid(details.patientId);
    if (!psid) {
      return {
        success: false,
        error: "Patient has no Messenger PSID — cannot send notification",
      };
    }

    const payload: NotificationPayload = {
      type: "follow_up",
      patientPsid: psid,
      appointmentReference: details.referenceNo,
      date: details.date,
      time: details.time,
      dentistName: details.dentistName,
    };

    const result = await sendNotification(payload);
    if (!result.success) {
      await createStaffNotification(psid, "follow_up", result.error ?? "Unknown error");
    }
    return { success: result.success, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send notification",
    };
  }
}
