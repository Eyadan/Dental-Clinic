import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import { ConsentListClient } from "./consent-list-client";

export interface ConsentListItem {
  consentId: string;
  appointmentId: string | null;
  patientName: string;
  patientContact: string | null;
  referenceNo: string | null;
  dentistName: string | null;
  treatmentInfo: string;
  consentVersion: string;
  signedAt: string | null;
  createdAt: string;
}

export default async function ConsentListPage() {
  const supabase = await createServerSupabaseClient();

  const { data: consents, error } = await supabase
    .from("consent_forms")
    .select(`
      id,
      appointment_id,
      treatment_info,
      consent_version,
      signed_at,
      created_at,
      appointments(
        id,
        reference_no,
        scheduled_date,
        patients(first_name, last_name, contact_no),
        dentists(users(first_name, last_name)),
        appointment_services(dental_services(name))
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Failed to load consent forms: {error.message}</p>
      </div>
    );
  }

  const items: ConsentListItem[] = (consents ?? []).map((consent: Record<string, unknown>) => {
    const appt = consent.appointments as unknown as Record<string, unknown> | null;
    const patient = appt ? getSingleJoined<{ first_name: string; last_name: string; contact_no: string }>(appt.patients) : null;
    const dentistObj = appt ? getSingleJoined<{ users: { first_name: string; last_name: string } | null }>(appt.dentists) : null;
    const dentistUser = dentistObj?.users ? getSingleJoined<{ first_name: string; last_name: string }>(dentistObj.users) : null;

    const rawServices = (appt?.appointment_services as unknown as Array<{ dental_services: { name: string } | null }>) ?? [];
    const serviceNames = rawServices.map((s: { dental_services: { name: string } | null }) => s.dental_services?.name).filter(Boolean) as string[];

    let treatmentText = (consent.treatment_info as string) ?? "";
    if (!treatmentText || treatmentText.trim() === "" || treatmentText === "{}") {
      treatmentText = serviceNames.length > 0 ? serviceNames.join(", ") : "General Dental Treatment & Anesthesia Waiver";
    }

    return {
      consentId: consent.id as string,
      appointmentId: (consent.appointment_id as string) ?? (appt?.id as string) ?? null,
      patientName: patient ? `${patient.first_name} ${patient.last_name}` : "Unknown Patient",
      patientContact: patient?.contact_no ?? null,
      referenceNo: (appt?.reference_no as string) ?? null,
      dentistName: dentistUser ? `Dr. ${dentistUser.first_name} ${dentistUser.last_name}` : null,
      treatmentInfo: treatmentText,
      consentVersion: (consent.consent_version as string) ?? "1.0",
      signedAt: consent.signed_at as string | null,
      createdAt: consent.created_at as string,
    };
  });

  return <ConsentListClient items={items} />;
}
