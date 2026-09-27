import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import { todayLocal } from "@/lib/utils/date-utils";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayLocal();

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      reference_no,
      scheduled_time,
      total_duration,
      visit_status,
      booking_status,
      patients(first_name, last_name, contact_no),
      dentists(users(first_name, last_name)),
      appointment_services(dental_services(name))
    `)
    .eq("scheduled_date", today)
    .eq("is_archived", false)
    .in("visit_status", ["checked_in", "waiting", "delayed", "in_consultation", "treatment_ongoing", "treatment_paused"])
    .order("scheduled_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch queue" }, { status: 500 });
  }

  const items = (appointments ?? []).map((appt: Record<string, unknown>) => {
    const patient = getSingleJoined<{ first_name: string; last_name: string; contact_no?: string | null }>(appt.patients);
    const dentist = getSingleJoined<{ users: unknown }>(appt.dentists);
    const dentistUser = dentist ? getSingleJoined<{ first_name: string; last_name: string }>(dentist.users) : null;
    
    const rawServices = appt.appointment_services as unknown as Array<{ dental_services: { name: string } | null }> | null;
    const services: string[] = (rawServices ?? [])
      .map((s) => s.dental_services?.name)
      .filter((name): name is string => Boolean(name));

    return {
      id: appt.id as string,
      reference_no: appt.reference_no as string,
      scheduled_time: (appt.scheduled_time as string).slice(0, 5),
      total_duration: (appt.total_duration as number) || 30,
      visit_status: appt.visit_status as string,
      booking_status: appt.booking_status as string,
      patient_name: patient ? `${patient.first_name} ${patient.last_name}` : "Unknown Patient",
      contact_no: patient?.contact_no ?? null,
      dentist_name: dentistUser ? `${dentistUser.first_name} ${dentistUser.last_name}` : "Unknown Dentist",
      services,
    };
  });

  return NextResponse.json({ items });
}
