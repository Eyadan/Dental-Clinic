import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { BillingClient } from "./billing-client";
import { getInvoiceAction, type InvoiceData } from "./actions";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select("id, patient_id, dentist_id, visit_status, booking_status")
    .eq("id", appointmentId)
    .single();

  if (error || !appointment) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Appointment not found</p>
      </div>
    );
  }

  const invoiceResult = await getInvoiceAction(appointmentId);
  const invoice: InvoiceData | null = invoiceResult.success ? (invoiceResult.data ?? null) : null;

  return <BillingClient appointmentId={appointmentId} invoice={invoice} />;
}
