"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import type { ServiceResult } from "@/lib/services/base-service";
import type { PaymentStatus } from "@/lib/types/enums";

export interface PatientBillingItem {
  appointmentId: string;
  referenceNo: string;
  invoiceId: string | null;
  totalAmount: number;
  paymentStatus: PaymentStatus | null;
  visitStatus: string | null;
  bookingStatus: string | null;
  scheduledDate: string;
  scheduledTime: string;
  dentistName: string;
  services: { name: string; price: number }[];
  payments: { id: string; amount: number; method: string; paidAt: string }[];
  invoiceCreatedAt: string | null;
}

export async function getPatientBillingHistoryAction(
  patientId: string,
): Promise<ServiceResult<PatientBillingItem[]>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        id,
        reference_no,
        scheduled_date,
        scheduled_time,
        visit_status,
        booking_status,
        dentists(users(first_name, last_name)),
        invoices(id, total_amount, payment_status, created_at),
        appointment_services(
          price,
          dental_services(name, default_price)
        )
      `)
      .eq("patient_id", patientId)
      .in("booking_status", ["approved", "confirmed", "completed"])
      .order("scheduled_date", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const items: PatientBillingItem[] = [];

    for (const appt of appointments ?? []) {
      const dentist = getSingleJoined<{ users: unknown }>(
        (appt as unknown as Record<string, unknown>).dentists,
      );
      const dentistUser = dentist
        ? getSingleJoined<{ first_name: string; last_name: string }>(dentist.users)
        : null;
      const invoice = getSingleJoined<{
        id: string;
        total_amount: number;
        payment_status: PaymentStatus;
        created_at: string;
      }>((appt as unknown as Record<string, unknown>).invoices);

      const rawServices = ((appt as unknown as Record<string, unknown>).appointment_services ?? []) as Array<{
        price: number;
        dental_services: { name: string; default_price: number } | null;
      }>;

      const services = rawServices.map((item) => {
        const priceVal =
          item.price != null && Number(item.price) > 0
            ? Number(item.price)
            : Number(item.dental_services?.default_price ?? 0);
        return {
          name: item.dental_services?.name ?? "Unknown Service",
          price: priceVal,
        };
      });

      const svcSum = services.reduce((sum, s) => sum + s.price, 0);
      const effectiveTotal =
        invoice && Number(invoice.total_amount) > 0
          ? Number(invoice.total_amount)
          : svcSum;

      let payments: { id: string; amount: number; method: string; paidAt: string }[] = [];

      if (invoice) {
        const { data: paymentRows } = await supabase
          .from("payments")
          .select("id, amount, method, paid_at")
          .eq("invoice_id", invoice.id)
          .order("paid_at", { ascending: false });

        payments = (paymentRows ?? []).map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.method,
          paidAt: p.paid_at,
        }));
      }

      items.push({
        appointmentId: appt.id as string,
        referenceNo: appt.reference_no as string,
        invoiceId: invoice?.id ?? null,
        totalAmount: effectiveTotal,
        paymentStatus: invoice?.payment_status ?? null,
        visitStatus: appt.visit_status as string | null,
        bookingStatus: appt.booking_status as string | null,
        scheduledDate: appt.scheduled_date as string,
        scheduledTime: (appt.scheduled_time as string)?.slice(0, 5) ?? "",
        dentistName: dentistUser
          ? `${dentistUser.first_name} ${dentistUser.last_name}`
          : "Unknown",
        services,
        payments,
        invoiceCreatedAt: invoice?.created_at ?? null,
      });
    }

    return { success: true, data: items };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load billing history",
    };
  }
}
