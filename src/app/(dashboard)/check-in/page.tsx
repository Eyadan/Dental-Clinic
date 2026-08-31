import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { todayLocal } from "@/lib/utils/date-utils";
import { CheckInClient } from "./check-in-client";

interface TodayAppointment {
  id: string;
  reference_no: string;
  booking_status: string;
  visit_status: string | null;
  scheduled_time: string;
  total_duration: number;
  patient_name: string;
  patient_contact: string;
}

export default async function CheckInPage() {
  const supabase = await createServerSupabaseClient();
  const today = todayLocal();

  const { data: appointments } = await supabase
    .from("appointments")
    .select(`
      id,
      reference_no,
      booking_status,
      visit_status,
      scheduled_time,
      total_duration,
      patients!inner(first_name, last_name, contact_no)
    `)
    .eq("scheduled_date", today)
    .eq("is_archived", false)
    .in("booking_status", ["approved", "confirmed"])
    .order("scheduled_time");

  const todayAppointments: TodayAppointment[] = (appointments ?? []).map((appt: Record<string, unknown>) => {
    const patient = appt.patients as { first_name: string; last_name: string; contact_no: string };
    return {
      id: appt.id as string,
      reference_no: appt.reference_no as string,
      booking_status: appt.booking_status as string,
      visit_status: appt.visit_status as string | null,
      scheduled_time: appt.scheduled_time as string,
      total_duration: appt.total_duration as number,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      patient_contact: patient.contact_no,
    };
  });

  return <CheckInClient initialAppointments={todayAppointments} />;
}
