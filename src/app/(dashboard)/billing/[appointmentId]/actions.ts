"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { SchedulingService } from "@/lib/services/scheduling-service";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import type { ServiceResult } from "@/lib/services/base-service";
import type { PaymentMethod, PaymentStatus } from "@/lib/types/enums";

export interface InvoiceLineItem {
  serviceId: string;
  serviceName: string;
  price: number;
}

export interface InvoiceData {
  id: string;
  appointmentId: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  lineItems: InvoiceLineItem[];
  payments: {
    id: string;
    amount: number;
    method: PaymentMethod;
    proofImageUrl: string | null;
    paidAt: string;
  }[];
  patientName: string;
  patientContact: string;
  dentistName: string;
  appointmentDate: string;
  createdAt: string;
}

export async function generateInvoiceAction(
  appointmentId: string,
): Promise<ServiceResult<{ id: string }>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    if (existing) {
      return { success: true, data: { id: existing.id } };
    }

    const { data: services, error: servicesError } = await supabase
      .from("appointment_services")
      .select(`
        service_id,
        price,
        dental_services(name, default_price)
      `)
      .eq("appointment_id", appointmentId);

    if (servicesError) {
      return { success: false, error: "Failed to fetch appointment services" };
    }

    const totalAmount = (services ?? []).reduce((sum, item) => {
      const dentalService = (item as unknown as {
        dental_services: { name: string; default_price: number } | null;
      }).dental_services;
      const price = item.price ?? dentalService?.default_price ?? 0;
      return sum + Number(price);
    }, 0);

    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert({
        appointment_id: appointmentId,
        total_amount: totalAmount,
        payment_status: "pending_payment",
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/billing/${appointmentId}`);
    return { success: true, data: { id: invoice.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate invoice",
    };
  }
}

export async function getInvoiceAction(
  appointmentId: string,
): Promise<ServiceResult<InvoiceData | null>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    if (invoiceError) {
      return { success: false, error: invoiceError.message };
    }

    if (!invoice) {
      return { success: true, data: null };
    }

    const { data: services } = await supabase
      .from("appointment_services")
      .select(`
        service_id,
        price,
        dental_services(name, default_price)
      `)
      .eq("appointment_id", appointmentId);

    const lineItems: InvoiceLineItem[] = (services ?? []).map((item) => {
      const dentalService = (item as unknown as {
        dental_services: { name: string; default_price: number } | null;
      }).dental_services;
      return {
        serviceId: item.service_id,
        serviceName: dentalService?.name ?? "Unknown Service",
        price: Number(item.price ?? dentalService?.default_price ?? 0),
      };
    });

    const { data: payments } = await supabase
      .from("payments")
      .select("id, amount, method, proof_image_url, paid_at")
      .eq("invoice_id", invoice.id)
      .order("paid_at", { ascending: false });

    const { data: appointment } = await supabase
      .from("appointments")
      .select(`
        scheduled_time,
        patients(first_name, last_name, contact_no),
        dentists(users(first_name, last_name))
      `)
      .eq("id", appointmentId)
      .single();

    const patient = getSingleJoined<{
      first_name: string;
      last_name: string;
      contact_no: string;
    }>((appointment as unknown as Record<string, unknown>)?.patients);
    const dentist = getSingleJoined<{ users: unknown }>(
      (appointment as unknown as Record<string, unknown>)?.dentists,
    );
    const dentistUser = dentist
      ? getSingleJoined<{ first_name: string; last_name: string }>(dentist.users)
      : null;

    return {
      success: true,
      data: {
        id: invoice.id,
        appointmentId: invoice.appointment_id,
        totalAmount: Number(invoice.total_amount),
        paymentStatus: invoice.payment_status,
        lineItems,
        payments: (payments ?? []).map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.method,
          proofImageUrl: p.proof_image_url,
          paidAt: p.paid_at,
        })),
        patientName: patient ? `${patient.first_name} ${patient.last_name}` : "Unknown",
        patientContact: patient?.contact_no ?? "",
        dentistName: dentistUser ? `${dentistUser.first_name} ${dentistUser.last_name}` : "Unknown",
        appointmentDate: appointment?.scheduled_time ?? "",
        createdAt: invoice.created_at,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch invoice",
    };
  }
}

export async function recordPaymentAction(
  invoiceId: string,
  amount: number,
  method: PaymentMethod,
  proofImageUrl: string | null,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: invoice } = await supabase
      .from("invoices")
      .select("total_amount, payment_status")
      .eq("id", invoiceId)
      .single();

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    const { data: existingPayments } = await supabase
      .from("payments")
      .select("amount")
      .eq("invoice_id", invoiceId);

    const totalPaid = (existingPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(invoice.total_amount) - totalPaid;

    if (amount > remaining + 0.01) {
      return { success: false, error: `Amount exceeds remaining balance of ₱${remaining.toFixed(2)}` };
    }

    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        invoice_id: invoiceId,
        amount,
        method,
        proof_image_url: proofImageUrl,
        recorded_by: user.id,
      });

    if (paymentError) {
      return { success: false, error: paymentError.message };
    }

    const newTotal = totalPaid + amount;
    const newStatus: PaymentStatus =
      newTotal >= Number(invoice.total_amount) - 0.01 ? "paid" : "partially_paid";

    const { error: updateError } = await supabase
      .from("invoices")
      .update({ payment_status: newStatus })
      .eq("id", invoiceId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath(`/billing`);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record payment",
    };
  }
}

export async function checkoutAction(
  appointmentId: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: invoice } = await supabase
      .from("invoices")
      .select("payment_status")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    if (!invoice) {
      return { success: false, error: "Invoice not found — generate invoice first" };
    }

    if (invoice.payment_status === "pending_payment") {
      return { success: false, error: "Cannot checkout — payment pending" };
    }

    const { error: apptError } = await supabase
      .from("appointments")
      .update({
        visit_status: "completed",
        booking_status: "completed",
      })
      .eq("id", appointmentId);

    if (apptError) {
      return { success: false, error: apptError.message };
    }

    revalidatePath(`/billing/${appointmentId}`);
    revalidatePath("/queue");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Checkout failed",
    };
  }
}

export async function createFollowUpAction(
  originalAppointmentId: string,
  scheduledDate: string,
  scheduledTime: string,
  serviceIds: string[],
): Promise<ServiceResult<{ id: string; referenceNo: string }>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: original, error: fetchError } = await supabase
      .from("appointments")
      .select("patient_id, dentist_id, total_duration")
      .eq("id", originalAppointmentId)
      .single();

    if (fetchError || !original) {
      return { success: false, error: "Original appointment not found" };
    }

    const schedulingService = new SchedulingService(supabase);
    const conflictResult = await schedulingService.checkConflict(
      original.dentist_id,
      scheduledDate,
      scheduledTime,
      original.total_duration,
      undefined,
    );

    if (conflictResult.hasConflict) {
      return { success: false, error: conflictResult.reason ?? "Time slot conflict" };
    }

    const referenceNo = `FU-${Date.now().toString(36).toUpperCase()}`;

    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .insert({
        patient_id: original.patient_id,
        dentist_id: original.dentist_id,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        total_duration: original.total_duration,
        booking_status: "approved",
        payment_status: "pending_payment",
        reference_no: referenceNo,
        is_archived: false,
      })
      .select("id, reference_no")
      .single();

    if (apptError || !appointment) {
      return { success: false, error: apptError?.message ?? "Failed to create follow-up appointment" };
    }

    if (serviceIds.length > 0) {
      const { data: services } = await supabase
        .from("dental_services")
        .select("id, default_price")
        .in("id", serviceIds);

      const priceMap = new Map((services ?? []).map((s) => [s.id, Number(s.default_price)]));
      const serviceRowsWithPrice = serviceIds.map((serviceId) => ({
        appointment_id: appointment.id,
        service_id: serviceId,
        price: priceMap.get(serviceId) ?? 0,
      }));

      await supabase.from("appointment_services").insert(serviceRowsWithPrice);
    }

    revalidatePath("/appointments");
    revalidatePath("/queue");
    return { success: true, data: { id: appointment.id, referenceNo: appointment.reference_no } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to schedule follow-up",
    };
  }
}
