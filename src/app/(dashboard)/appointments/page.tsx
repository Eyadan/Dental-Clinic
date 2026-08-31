import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import { AppointmentCalendar } from "@/components/appointments/appointment-calendar";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const targetMonth = month ?? currentMonth;

  const [year, monthNum] = targetMonth.split("-").map(Number);
  const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const endDate = `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const supabase = await createServerSupabaseClient();

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      reference_no,
      patient_id,
      dentist_id,
      booking_status,
      visit_status,
      payment_status,
      scheduled_date,
      scheduled_time,
      total_duration,
      is_archived,
      created_at,
      updated_at,
      patients!inner(first_name, last_name)
    `)
    .eq("is_archived", false)
    .gte("scheduled_date", startDate)
    .lte("scheduled_date", endDate)
    .order("scheduled_time", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch appointments: ${error.message}`);
  }

  const calendarAppointments = (appointments ?? []).map((appt: Record<string, unknown>) => {
    const patient = getSingleJoined<{
      first_name: string;
      last_name: string;
    }>(appt.patients);
    return {
      id: appt.id as string,
      reference_no: appt.reference_no as string,
      booking_status: appt.booking_status as string,
      scheduled_date: appt.scheduled_date as string,
      scheduled_time: appt.scheduled_time as string,
      total_duration: appt.total_duration as number,
      patient_name: patient ? `${patient.first_name} ${patient.last_name}` : "Unknown Patient",
    };
  });

  return <AppointmentCalendar appointments={calendarAppointments} month={targetMonth} />;
}
