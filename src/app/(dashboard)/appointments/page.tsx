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

  const [appointmentsRes, dentistsRes] = await Promise.all([
    supabase
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
        patients!inner(first_name, last_name),
        dentists(id, specialization, users(first_name, last_name))
      `)
      .eq("is_archived", false)
      .gte("scheduled_date", startDate)
      .lte("scheduled_date", endDate)
      .order("scheduled_time", { ascending: true }),
    supabase
      .from("dentists")
      .select("id, specialization, users(first_name, last_name)")
      .eq("is_active", true),
  ]);

  if (appointmentsRes.error) {
    throw new Error(`Failed to fetch appointments: ${appointmentsRes.error.message}`);
  }

  const dentistsList = (dentistsRes.data ?? []).map((d: Record<string, unknown>) => {
    const userObj = getSingleJoined<{ first_name: string; last_name: string }>(d.users);
    const name = userObj ? `Dr. ${userObj.first_name} ${userObj.last_name}` : "Unknown Dentist";
    return {
      id: d.id as string,
      name,
      specialization: d.specialization as string | null,
    };
  });

  const calendarAppointments = (appointmentsRes.data ?? []).map((appt: Record<string, unknown>) => {
    const patient = getSingleJoined<{
      first_name: string;
      last_name: string;
    }>(appt.patients);
    const dentist = getSingleJoined<{
      id: string;
      specialization: string | null;
      users: unknown;
    }>(appt.dentists);
    const dentistUser = dentist ? getSingleJoined<{ first_name: string; last_name: string }>(dentist.users) : null;
    const dentistName = dentistUser ? `Dr. ${dentistUser.first_name} ${dentistUser.last_name}` : "Unassigned Dentist";

    return {
      id: appt.id as string,
      reference_no: appt.reference_no as string,
      booking_status: appt.booking_status as string,
      scheduled_date: appt.scheduled_date as string,
      scheduled_time: appt.scheduled_time as string,
      total_duration: appt.total_duration as number,
      patient_name: patient ? `${patient.first_name} ${patient.last_name}` : "Unknown Patient",
      dentist_id: (appt.dentist_id as string) ?? null,
      dentist_name: dentistName,
      dentist_specialization: dentist?.specialization ?? null,
    };
  });

  return (
    <AppointmentCalendar
      appointments={calendarAppointments}
      dentists={dentistsList}
      month={targetMonth}
    />
  );
}
