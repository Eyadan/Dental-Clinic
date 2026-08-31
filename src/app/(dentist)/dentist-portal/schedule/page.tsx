import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import { todayLocal } from "@/lib/utils/date-utils";
import { DentistScheduleClient } from "./schedule-client";

export default async function DentistSchedulePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: dentist } = await supabase
    .from("dentists")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!dentist) return null;

  const today = todayLocal();

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      reference_no,
      scheduled_time,
      total_duration,
      booking_status,
      visit_status,
      patients(first_name, last_name, contact_no),
      appointment_services(service_id, dental_services(name))
    `)
    .eq("dentist_id", dentist.id)
    .eq("scheduled_date", today)
    .eq("is_archived", false)
    .in("booking_status", ["approved", "confirmed", "reschedule_required", "rescheduled", "pending"])
    .order("scheduled_time", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch schedule: ${error.message}`);
  }

  const scheduleItems = (appointments ?? []).map((appt: Record<string, unknown>) => {
    const patient = getSingleJoined<{ first_name: string; last_name: string; contact_no: string }>(appt.patients);
    const services = appt.appointment_services as Array<{
      dental_services: { name: string };
    }>;
    const serviceNames = services?.map((s) => s.dental_services?.name).filter(Boolean) ?? [];
    return {
      id: appt.id as string,
      reference_no: appt.reference_no as string,
      scheduled_time: appt.scheduled_time as string,
      total_duration: appt.total_duration as number,
      booking_status: appt.booking_status as string,
      visit_status: appt.visit_status as string | null,
      patient_name: patient ? `${patient.first_name} ${patient.last_name}` : "Unknown Patient",
      patient_contact: patient?.contact_no ?? "",
      services: serviceNames,
    };
  });

  return <DentistScheduleClient items={scheduleItems} />;
}
