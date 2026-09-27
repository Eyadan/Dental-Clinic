import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { ensureConsentClauses } from "@/lib/constants/consent-clauses";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import { DentalChartService } from "@/lib/services/dental-chart-service";
import { ConsultationClient } from "./consultation-client";

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select(`
      id,
      patient_id,
      scheduled_time,
      visit_status,
      patients(first_name, last_name, contact_no, birth_date, medical_history, allergies),
      dentists(users(first_name, last_name)),
      appointment_services(dental_services(name))
    `)
    .eq("id", appointmentId)
    .single();

  if (error || !appointment) {
    notFound();
  }

  const patient = getSingleJoined<{
    first_name: string;
    last_name: string;
    contact_no: string;
    birth_date: string | null;
    medical_history: string | null;
    allergies: string | null;
  }>(appointment.patients);
  const dentist = getSingleJoined<{ users: unknown }>(appointment.dentists);
  const dentistUser = dentist ? getSingleJoined<{ first_name: string; last_name: string }>(dentist.users) : null;
  const apptServices = appointment.appointment_services as unknown as Array<{
    dental_services: { name: string };
  }>;
  const services = apptServices?.map((s) => s.dental_services?.name).filter(Boolean) ?? [];

  const { data: consent } = await supabase
    .from("consent_forms")
    .select("id, signed_at")
    .eq("appointment_id", appointmentId)
    .limit(1)
    .maybeSingle();

  // Fetch consent clauses directly using authenticated Supabase client with PDA fallback
  let consentClauses = [];
  try {
    const { data: dbClauses, error: clausesErr } = await supabase
      .from("consent_clauses")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (!clausesErr && dbClauses && dbClauses.length > 0) {
      consentClauses = dbClauses;
    } else {
      consentClauses = await ensureConsentClauses(supabase);
    }
  } catch (err) {
    console.error("Failed to load consent clauses from DB:", err);
    consentClauses = await ensureConsentClauses(supabase);
  }

  const dentalChartService = new DentalChartService(supabase);
  const { chart: dentalChart, presence: dentalChartPresence, findings: dentalChartFindings } = await dentalChartService.getFullChart(
    appointment.patient_id,
  );

  const isConsentSigned = !!consent?.signed_at || appointment.visit_status === "consent_signed";

  return (
    <ConsultationClient
      appointmentId={appointmentId}
      patientId={appointment.patient_id}
      patientName={patient ? `${patient.first_name} ${patient.last_name}` : "Unknown Patient"}
      patientContact={patient?.contact_no ?? ""}
      patientBirthDate={patient?.birth_date ?? null}
      patientMedicalHistory={patient?.medical_history ?? null}
      patientAllergies={patient?.allergies ?? null}
      visitStatus={appointment.visit_status ?? ""}
      scheduledTime={appointment.scheduled_time ?? ""}
      dentistName={dentistUser ? `Dr. ${dentistUser.first_name} ${dentistUser.last_name}` : "Assigned Dentist"}
      services={services}
      hasConsent={!!consent}
      isConsentSigned={isConsentSigned}
      consentClauses={consentClauses ?? []}
      dentalChart={dentalChart}
      dentalChartPresence={dentalChartPresence}
      dentalChartFindings={dentalChartFindings}
    />
  );
}
