import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import { todayLocal } from "@/lib/utils/date-utils";
import { ConsultationListClient, type ConsultationListItem } from "./consultation-list-client";

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
      patients(first_name, last_name, contact_no, allergies),
      dentists(users(first_name, last_name)),
      appointment_services(dental_services(name)),
      consent_forms(id, signed_at)
    `)
    .eq("scheduled_date", today)
    .eq("is_archived", false)
    .in("booking_status", ["approved", "confirmed"])
    .in("visit_status", ["checked_in", "waiting", "in_consultation", "treatment_ongoing", "treatment_paused", "consent_signed"])
    .order("scheduled_time", { ascending: true });

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground text-xs font-medium">Failed to load clinical consultation queue.</p>
      </div>
    );
  }

  const items: ConsultationListItem[] = (appointments ?? []).map((appt: Record<string, unknown>) => {
    const patient = getSingleJoined<{ first_name: string; last_name: string; contact_no: string | null; allergies: string | null }>(appt.patients);
    
    const dentistObj = getSingleJoined<{ users: unknown }>(appt.dentists);
    const dentistUser = dentistObj ? getSingleJoined<{ first_name: string; last_name: string }>(dentistObj.users) : null;

    const rawServices = appt.appointment_services as unknown as Array<{ dental_services: { name: string } | null }> | null;
    const servicesList: string[] = (rawServices ?? [])
      .map((s) => s.dental_services?.name)
      .filter((name): name is string => Boolean(name));

    const consentForms = appt.consent_forms as unknown as Array<{ id: string; signed_at: string | null }> | null;
    const activeConsent = consentForms && consentForms.length > 0 ? consentForms[0] : null;

    return {
      appointmentId: appt.id as string,
      referenceNo: appt.reference_no as string,
      patientName: patient ? `${patient.first_name} ${patient.last_name}` : "Unknown Patient",
      patientPhone: patient?.contact_no ?? null,
      patientAllergies: patient?.allergies ?? null,
      dentistName: dentistUser ? `Dr. ${dentistUser.first_name} ${dentistUser.last_name}` : "Attending Dentist",
      scheduledTime: (appt.scheduled_time as string)?.slice(0, 5) ?? "",
      visitStatus: appt.visit_status as string | null,
      services: servicesList,
      hasConsent: Boolean(activeConsent),
      isConsentSigned: Boolean(activeConsent?.signed_at),
    };
  });

  return <ConsultationListClient items={items} />;
}
