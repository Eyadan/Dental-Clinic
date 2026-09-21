import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import {
  ReportsClient,
  type AnalyticsPayment,
  type AnalyticsInvoice,
  type AnalyticsAppointment,
  type AnalyticsDoctor,
  type AnalyticsProcedureItem,
} from "./reports-client";

export default async function ReportsPage() {
  const supabase = await createServerSupabaseClient();

  // Run all report queries in parallel
  const [
    paymentsRes,
    invoicesRes,
    appointmentsRes,
    dentistsRes,
    appointmentServicesRes,
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("id, invoice_id, amount, method, paid_at")
      .order("paid_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, appointment_id, total_amount, payment_status, created_at"),
    supabase
      .from("appointments")
      .select("id, reference_no, dentist_id, booking_status, visit_status, payment_status, scheduled_date, total_duration, patients(id, first_name, last_name, contact_no)")
      .order("scheduled_date", { ascending: false }),
    supabase
      .from("dentists")
      .select("id, license_no, specialization, is_active, users(first_name, last_name)"),
    supabase
      .from("appointment_services")
      .select("id, appointment_id, price, dental_services(name)"),
  ]);

  const payments: AnalyticsPayment[] = (paymentsRes.data ?? []).map((p) => ({
    id: p.id,
    invoiceId: p.invoice_id,
    amount: Number(p.amount) || 0,
    method: p.method,
    paidAt: p.paid_at,
  }));

  const invoices: AnalyticsInvoice[] = (invoicesRes.data ?? []).map((inv) => ({
    id: inv.id,
    appointmentId: inv.appointment_id,
    totalAmount: Number(inv.total_amount) || 0,
    paymentStatus: inv.payment_status,
    createdAt: inv.created_at,
  }));

  const appointments: AnalyticsAppointment[] = (appointmentsRes.data ?? []).map((apt) => {
    const patientObj = getSingleJoined<{ first_name: string; last_name: string; contact_no: string }>(apt.patients);
    const patientName = patientObj ? `${patientObj.first_name} ${patientObj.last_name}` : "Walk-in Patient";
    const patientContact = patientObj?.contact_no || "N/A";

    return {
      id: apt.id,
      referenceNo: apt.reference_no,
      dentistId: apt.dentist_id,
      bookingStatus: apt.booking_status,
      visitStatus: apt.visit_status,
      paymentStatus: apt.payment_status,
      scheduledDate: apt.scheduled_date,
      totalDuration: apt.total_duration || 0,
      patientName,
      patientContact,
    };
  });

  const doctors: AnalyticsDoctor[] = (dentistsRes.data ?? []).map((d) => {
    const userObj = getSingleJoined<{ first_name: string; last_name: string }>(d.users);
    const fullName = userObj ? `Dr. ${userObj.first_name} ${userObj.last_name}` : "Dr. Unknown";

    return {
      id: d.id,
      fullName,
      specialization: d.specialization || "General Dentistry",
      licenseNo: d.license_no,
      isActive: d.is_active,
    };
  });

  const procedureItems: AnalyticsProcedureItem[] = (appointmentServicesRes.data ?? []).map((item) => {
    const serviceObj = getSingleJoined<{ name: string }>(item.dental_services);
    return {
      id: item.id,
      appointmentId: item.appointment_id,
      serviceName: serviceObj?.name ?? "General Procedure",
      price: Number(item.price) || 0,
    };
  });

  return (
    <ReportsClient
      payments={payments}
      invoices={invoices}
      appointments={appointments}
      doctors={doctors}
      procedureItems={procedureItems}
    />
  );
}
