import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import { BillingListClient } from "./billing-list-client";

interface BillingListItem {
  appointmentId: string;
  referenceNo: string;
  patientName: string;
  dentistName: string;
  scheduledDate: string;
  scheduledTime: string;
  invoiceId: string | null;
  totalAmount: number | null;
  paymentStatus: string | null;
  visitStatus: string | null;
}

export default async function BillingListPage() {
  // Temporary 0.9s delay for skeleton loading state preview
  await new Promise((resolve) => setTimeout(resolve, 900));

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
      is_archived,
      patients(first_name, last_name),
      dentists(users(first_name, last_name)),
      invoices(id, total_amount, payment_status)
    `)
    .eq("is_archived", false)
    .in("booking_status", ["approved", "confirmed", "completed"])
    .order("scheduled_date", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Failed to load billing records.</p>
      </div>
    );
  }

  const items: BillingListItem[] = (appointments ?? []).map((appt: Record<string, unknown>) => {
    const patient = getSingleJoined<{ first_name: string; last_name: string }>(appt.patients);
    const dentist = getSingleJoined<{ users: unknown }>(appt.dentists);
    const dentistUser = dentist ? getSingleJoined<{ first_name: string; last_name: string }>(dentist.users) : null;
    const invoice = getSingleJoined<{ id: string; total_amount: number; payment_status: string }>(appt.invoices);

    return {
      appointmentId: appt.id as string,
      referenceNo: appt.reference_no as string,
      patientName: patient ? `${patient.first_name} ${patient.last_name}` : "Unknown",
      dentistName: dentistUser ? `${dentistUser.first_name} ${dentistUser.last_name}` : "Unknown",
      scheduledDate: appt.scheduled_date as string,
      scheduledTime: (appt.scheduled_time as string)?.slice(0, 5) ?? "",
      invoiceId: invoice?.id ?? null,
      totalAmount: invoice ? Number(invoice.total_amount) : null,
      paymentStatus: invoice?.payment_status ?? null,
      visitStatus: appt.visit_status as string | null,
    };
  });

  return <BillingListClient items={items} />;
}
