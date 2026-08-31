import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import { todayLocal } from "@/lib/utils/date-utils";
import { ConsultationListClient } from "./consultation-list-client";

interface ConsultationListItem {
  appointmentId: string;
  referenceNo: string;
  patientName: string;
  scheduledTime: string;
  visitStatus: string | null;
  hasConsent: boolean;
}

export default async function ConsultationListPage() {
  const supabase = await createServerSupabaseClient();
  const today = todayLocal();

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      reference_no,
      scheduled_time,
      visit_status,
      patients(first_name, last_name),
      consent_forms(id)
    `)
    .eq("scheduled_date", today)
    .eq("is_archived", false)
    .in("booking_status", ["approved", "confirmed"])
    .in("visit_status", ["checked_in", "waiting", "in_consultation", "treatment_ongoing", "treatment_paused", "consent_signed"])
    .order("scheduled_time", { ascending: true });

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Failed to load consultation queue.</p>
      </div>
    );
  }

  const items: ConsultationListItem[] = (appointments ?? []).map((appt: Record<string, unknown>) => {
    const patient = getSingleJoined<{ first_name: string; last_name: string }>(appt.patients);
    const consentForms = appt.consent_forms as unknown as Array<{ id: string }> | null;
    return {
      appointmentId: appt.id as string,
      referenceNo: appt.reference_no as string,
      patientName: patient ? `${patient.first_name} ${patient.last_name}` : "Unknown",
      scheduledTime: (appt.scheduled_time as string)?.slice(0, 5) ?? "",
      visitStatus: appt.visit_status as string | null,
      hasConsent: (consentForms?.length ?? 0) > 0,
    };
  });

  return <ConsultationListClient items={items} />;
}
