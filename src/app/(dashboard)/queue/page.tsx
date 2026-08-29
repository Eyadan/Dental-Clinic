import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import { QueueClient } from "./queue-client";

export default async function QueuePage() {
  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      reference_no,
      scheduled_time,
      total_duration,
      visit_status,
      booking_status,
      patients(first_name, last_name),
      dentists(users(first_name, last_name))
    `)
    .eq("scheduled_date", today)
    .eq("is_archived", false)
    .in("visit_status", ["checked_in", "waiting", "delayed", "in_consultation", "treatment_ongoing", "treatment_paused"])
    .order("scheduled_time", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch queue: ${error.message}`);
  }

  const queueItems = (appointments ?? []).map((appt: Record<string, unknown>) => {
    const patient = getSingleJoined<{ first_name: string; last_name: string }>(appt.patients);
    const dentist = getSingleJoined<{ users: unknown }>(appt.dentists);
    const dentistUser = dentist ? getSingleJoined<{ first_name: string; last_name: string }>(dentist.users) : null;
    return {
      id: appt.id as string,
      reference_no: appt.reference_no as string,
      scheduled_time: (appt.scheduled_time as string).slice(0, 5),
      total_duration: appt.total_duration as number,
      visit_status: appt.visit_status as string,
      booking_status: appt.booking_status as string,
      patient_name: patient ? `${patient.first_name} ${patient.last_name}` : "Unknown Patient",
      dentist_name: dentistUser ? `${dentistUser.first_name} ${dentistUser.last_name}` : "Unknown Dentist",
    };
  });

  return <QueueClient items={queueItems} />;
}
