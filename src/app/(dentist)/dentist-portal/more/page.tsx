import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import { todayLocal } from "@/lib/utils/date-utils";
import { MorePageClient } from "./more-client";

export default async function MorePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: dentist } = await supabase
    .from("dentists")
    .select("id, specialization")
    .eq("user_id", user.id)
    .single();

  if (!dentist) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("first_name, last_name, email")
    .eq("id", user.id)
    .single();

  const today = todayLocal();

  const { data: todayAppointments } = await supabase
    .from("appointments")
    .select(`
      id,
      reference_no,
      scheduled_time,
      total_duration,
      booking_status,
      visit_status,
      patients(first_name, last_name, contact_no, email, birth_date, medical_history, allergies)
    `)
    .eq("dentist_id", dentist.id)
    .eq("scheduled_date", today)
    .eq("is_archived", false)
    .in("booking_status", ["approved", "confirmed", "rescheduled", "reschedule_required"])
    .order("scheduled_time", { ascending: true });

  const patients = (todayAppointments ?? []).map((appt: Record<string, unknown>) => {
    const patient = getSingleJoined<{
      first_name: string;
      last_name: string;
      contact_no: string;
      email: string | null;
      birth_date: string | null;
      medical_history: string | null;
      allergies: string | null;
    }>(appt.patients);
    return {
      id: appt.id as string,
      reference_no: appt.reference_no as string,
      scheduled_time: appt.scheduled_time as string,
      booking_status: appt.booking_status as string,
      visit_status: appt.visit_status as string | null,
      patient_name: patient ? `${patient.first_name} ${patient.last_name}` : "Unknown Patient",
      patient_contact: patient?.contact_no ?? "",
      patient_email: patient?.email ?? null,
      patient_birth_date: patient?.birth_date ?? null,
      patient_medical_history: patient?.medical_history ?? null,
      patient_allergies: patient?.allergies ?? null,
    };
  });

  return (
    <MorePageClient
      dentistName={userData ? `${userData.first_name} ${userData.last_name}` : "Unknown"}
      dentistEmail={userData?.email ?? ""}
      specialization={dentist.specialization}
      patients={patients}
    />
  );
}
