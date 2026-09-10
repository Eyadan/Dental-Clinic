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
  visitStatus: string | null;
  bookingStatus: string | null;
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
      const price = item.price != null && Number(item.price) > 0 ? Number(item.price) : Number(dentalService?.default_price ?? 0);
      return sum + price;
    }, 0);

    const paymentStatus: PaymentStatus = totalAmount === 0 ? "paid" : "pending_payment";

    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert({
        appointment_id: appointmentId,
        total_amount: totalAmount,
        payment_status: paymentStatus,
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
      const priceVal = item.price != null && Number(item.price) > 0 ? Number(item.price) : Number(dentalService?.default_price ?? 0);
      return {
        serviceId: item.service_id,
        serviceName: dentalService?.name ?? "Unknown Service",
        price: priceVal,
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
        visit_status,
        booking_status,
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

    const calculatedTotal = lineItems.reduce((sum, item) => sum + item.price, 0);
    const effectiveTotal = Number(invoice.total_amount) > 0 ? Number(invoice.total_amount) : calculatedTotal;

    if (Number(invoice.total_amount) === 0 && calculatedTotal > 0) {
      await supabase.from("invoices").update({ total_amount: calculatedTotal, payment_status: "pending_payment" }).eq("id", invoice.id);
    }

    return {
      success: true,
      data: {
        id: invoice.id,
        appointmentId: invoice.appointment_id,
        totalAmount: effectiveTotal,
        paymentStatus: Number(invoice.total_amount) === 0 && calculatedTotal > 0 ? "pending_payment" : invoice.payment_status,
        visitStatus: appointment?.visit_status ?? null,
        bookingStatus: appointment?.booking_status ?? null,
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

    if (invoice.payment_status === "paid" || remaining <= 0.001) {
      return { success: false, error: "Cannot record payment — invoice is already fully paid." };
    }

    if (method !== "cash" && (!proofImageUrl || proofImageUrl.trim() === "")) {
      return { success: false, error: "Proof of payment photo is required for digital payment methods (GCash, Maya, Card, Bank Transfer)." };
    }

    if (amount > remaining + 0.01) {
      return { success: false, error: `Amount exceeds remaining balance of ₱${remaining.toFixed(2)}` };
    }

    const { data: newPayment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        invoice_id: invoiceId,
        amount,
        method,
        proof_image_url: proofImageUrl,
        recorded_by: user.id,
      })
      .select("id")
      .single();

    if (paymentError || !newPayment) {
      return { success: false, error: paymentError?.message ?? "Failed to record payment" };
    }

    if (proofImageUrl) {
      await supabase.from("payment_receipt_versions").insert({
        payment_id: newPayment.id,
        version_number: 1,
        proof_image_url: proofImageUrl,
        correction_reason: "Original receipt photo uploaded upon payment recording",
        uploaded_by: user.id,
      });
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

    if (newStatus === "paid") {
      const { data: invAppt } = await supabase
        .from("invoices")
        .select("appointment_id")
        .eq("id", invoiceId)
        .single();

      if (invAppt?.appointment_id) {
        await supabase
          .from("appointments")
          .update({
            booking_status: "completed",
            visit_status: "completed",
          })
          .eq("id", invAppt.appointment_id);
      }
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

export interface ReceiptVersionData {
  id: string;
  paymentId: string;
  versionNumber: number | null;
  proofImageUrl: string;
  correctionReason: string;
  status: "pending" | "approved" | "rejected";
  requestedByEmail: string;
  reviewedByEmail: string | null;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export async function requestReceiptReplacementAction(
  paymentId: string,
  proofImageUrl: string,
  reason: string,
): Promise<ServiceResult<{ isAutoApproved: boolean }>> {
  try {
    if (!reason || reason.trim().length === 0) {
      return { success: false, error: "A mandatory correction reason is required before submitting a receipt change." };
    }

    if (!proofImageUrl || proofImageUrl.trim().length === 0) {
      return { success: false, error: "A replacement receipt photo is required." };
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = dbUser?.role === "admin";

    const { data: payment } = await supabase
      .from("payments")
      .select("id, invoice_id, proof_image_url, recorded_by")
      .eq("id", paymentId)
      .single();

    if (!payment) {
      return { success: false, error: "Payment record not found" };
    }

    // Ensure Version 1 (Original) exists in history
    const { data: existingVersions } = await supabase
      .from("payment_receipt_versions")
      .select("version_number")
      .eq("payment_id", paymentId)
      .order("version_number", { ascending: false });

    const maxVer = (existingVersions ?? []).reduce(
      (max, v) => (v.version_number && v.version_number > max ? v.version_number : max),
      0,
    );

    if (maxVer === 0 && payment.proof_image_url) {
      await supabase.from("payment_receipt_versions").insert({
        payment_id: paymentId,
        version_number: 1,
        proof_image_url: payment.proof_image_url,
        correction_reason: "Original receipt photo recorded prior to correction",
        status: "approved",
        requested_by: payment.recorded_by,
        reviewed_by: payment.recorded_by,
        reviewed_at: new Date().toISOString(),
      });
    }

    if (isAdmin) {
      // Admin Auto-Approves immediately
      const nextVer = (maxVer === 0 ? 1 : maxVer) + 1;
      const { error: versionError } = await supabase
        .from("payment_receipt_versions")
        .insert({
          payment_id: paymentId,
          version_number: nextVer,
          proof_image_url: proofImageUrl,
          correction_reason: reason.trim(),
          status: "approved",
          requested_by: user.id,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        });

      if (versionError) {
        return { success: false, error: `Failed to save receipt version: ${versionError.message}` };
      }

      await supabase
        .from("payments")
        .update({ proof_image_url: proofImageUrl })
        .eq("id", paymentId);

      const { data: invoice } = await supabase
        .from("invoices")
        .select("appointment_id")
        .eq("id", payment.invoice_id)
        .single();

      if (invoice?.appointment_id) {
        revalidatePath(`/billing/${invoice.appointment_id}`);
      }
      revalidatePath("/billing");
      return { success: true, data: { isAutoApproved: true } };
    } else {
      // Staff (Dentist / Receptionist) submits a Pending Request
      const { error: versionError } = await supabase
        .from("payment_receipt_versions")
        .insert({
          payment_id: paymentId,
          version_number: null,
          proof_image_url: proofImageUrl,
          correction_reason: reason.trim(),
          status: "pending",
          requested_by: user.id,
        });

      if (versionError) {
        return { success: false, error: `Failed to submit receipt request: ${versionError.message}` };
      }

      const { data: invoice } = await supabase
        .from("invoices")
        .select("appointment_id")
        .eq("id", payment.invoice_id)
        .single();

      if (invoice?.appointment_id) {
        revalidatePath(`/billing/${invoice.appointment_id}`);
      }
      revalidatePath("/billing");
      return { success: true, data: { isAutoApproved: false } };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process receipt request",
    };
  }
}

export async function reviewReceiptReplacementAction(
  versionId: string,
  action: "approve" | "reject",
  rejectionReason?: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (dbUser?.role !== "admin") {
      return { success: false, error: "Only Clinic Administrators can approve or reject receipt photo requests." };
    }

    const { data: targetVersion } = await supabase
      .from("payment_receipt_versions")
      .select("id, payment_id, proof_image_url, status")
      .eq("id", versionId)
      .single();

    if (!targetVersion) {
      return { success: false, error: "Receipt change request not found" };
    }

    if (targetVersion.status !== "pending") {
      return { success: false, error: `This receipt request has already been ${targetVersion.status}` };
    }

    if (action === "approve") {
      const { data: existingVersions } = await supabase
        .from("payment_receipt_versions")
        .select("version_number")
        .eq("payment_id", targetVersion.payment_id);

      const maxVer = (existingVersions ?? []).reduce(
        (max, v) => (v.version_number && v.version_number > max ? v.version_number : max),
        0,
      );

      const nextVer = maxVer + 1;

      const { error: updateVerError } = await supabase
        .from("payment_receipt_versions")
        .update({
          status: "approved",
          version_number: nextVer,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", versionId);

      if (updateVerError) {
        return { success: false, error: updateVerError.message };
      }

      await supabase
        .from("payments")
        .update({ proof_image_url: targetVersion.proof_image_url })
        .eq("id", targetVersion.payment_id);
    } else {
      const { error: updateVerError } = await supabase
        .from("payment_receipt_versions")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason?.trim() || "Rejected by Clinic Administrator",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", versionId);

      if (updateVerError) {
        return { success: false, error: updateVerError.message };
      }
    }

    revalidatePath("/billing");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to review receipt request",
    };
  }
}

export async function getReceiptHistoryAction(
  paymentId: string,
): Promise<ServiceResult<{ versions: ReceiptVersionData[]; currentUserRole: string }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    let currentUserRole = "receptionist";
    if (user) {
      const { data: dbUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      if (dbUser?.role) currentUserRole = dbUser.role;
    }

    const { data: versions, error } = await supabase
      .from("payment_receipt_versions")
      .select(`
        id,
        payment_id,
        version_number,
        proof_image_url,
        correction_reason,
        status,
        rejection_reason,
        created_at,
        reviewed_at,
        requested_user:requested_by(email, first_name, last_name),
        reviewed_user:reviewed_by(email, first_name, last_name)
      `)
      .eq("payment_id", paymentId)
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    const result: ReceiptVersionData[] = (versions ?? []).map((v) => {
      const reqU = getSingleJoined<{ email: string; first_name: string; last_name: string }>(
        (v as unknown as Record<string, unknown>).requested_user,
      );
      const revU = getSingleJoined<{ email: string; first_name: string; last_name: string }>(
        (v as unknown as Record<string, unknown>).reviewed_user,
      );

      const reqStr = reqU ? (reqU.email || `${reqU.first_name} ${reqU.last_name}`) : "Clinic Staff";
      const revStr = revU ? (revU.email || `${revU.first_name} ${revU.last_name}`) : null;

      return {
        id: v.id,
        paymentId: v.payment_id,
        versionNumber: v.version_number,
        proofImageUrl: v.proof_image_url,
        correctionReason: v.correction_reason,
        status: v.status as "pending" | "approved" | "rejected",
        requestedByEmail: reqStr,
        reviewedByEmail: revStr,
        rejectionReason: v.rejection_reason,
        createdAt: v.created_at,
        reviewedAt: v.reviewed_at,
      };
    });

    return { success: true, data: { versions: result, currentUserRole } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch receipt history",
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
      .select("payment_status, total_amount")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    if (!invoice) {
      return { success: false, error: "Invoice not found — generate invoice first" };
    }

    if (invoice.payment_status === "pending_payment" && Number(invoice.total_amount) > 0) {
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

export interface ToothFindingSummary {
  toothNumber: number;
  findingCode: string;
  surfaces: string[];
  notes: string | null;
}

export async function getPatientDentalChartSummaryAction(
  appointmentId: string,
): Promise<ServiceResult<ToothFindingSummary[]>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: appt } = await supabase
      .from("appointments")
      .select("patient_id")
      .eq("id", appointmentId)
      .single();

    if (!appt?.patient_id) {
      return { success: false, error: "Appointment or patient not found" };
    }

    const { DentalChartService } = await import("@/lib/services/dental-chart-service");
    const chartService = new DentalChartService(supabase);
    const fullChart = await chartService.getFullChart(appt.patient_id);

    const summaries: ToothFindingSummary[] = (fullChart.findings ?? []).map((f) => {
      const surfaces = (f.finding_surfaces ?? []).map((s) => s.surface);
      return {
        toothNumber: f.tooth_number,
        findingCode: f.code,
        surfaces,
        notes: f.notes ?? null,
      };
    });

    return { success: true, data: summaries };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load dental chart findings",
    };
  }
}
