import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getServerUserContext } from "@/lib/supabase/user-context";
import { getCachedDentists } from "@/lib/cache/reference-data";
import { todayLocal } from "@/lib/utils/date-utils";
import { PatientService } from "@/lib/services/patient-service";
import { PatientsMobileClient, type MobilePatientItem } from "./patients-mobile-client";

export default async function DentistPortalPatientsPage() {
  const { userId } = await getServerUserContext();
  if (!userId) return null;

  const supabase = await createServerSupabaseClient();
  const dentists = await getCachedDentists();
  const dentist = dentists.find((d) => d.user_id === userId);
  if (!dentist) return null;

  const today = todayLocal();
  const patientService = new PatientService(supabase);

  // Fetch initial active patients and today's appointments for this dentist
  const [patientsResult, { data: todayAppointments }] = await Promise.all([
    patientService.getPatients({
      query: "",
      page: 1,
      pageSize: 50,
    }),
    supabase
      .from("appointments")
      .select("patient_id, scheduled_time")
      .eq("dentist_id", dentist.id)
      .eq("scheduled_date", today)
      .eq("is_archived", false)
      .in("booking_status", ["approved", "confirmed", "rescheduled", "reschedule_required"]),
  ]);

  const todayMap = new Map<string, string>();
  for (const appt of todayAppointments ?? []) {
    if (appt.patient_id) {
      todayMap.set(appt.patient_id, appt.scheduled_time);
    }
  }

  const mappedPatients: MobilePatientItem[] = (patientsResult.data ?? []).map((patient) => ({
    ...patient,
    isTodayPatient: todayMap.has(patient.id),
    scheduledTime: todayMap.get(patient.id) ?? null,
  }));

  return (
    <PatientsMobileClient
      initialPatients={mappedPatients}
      totalCount={patientsResult.total}
      dentistName={dentist.full_name || "Doctor"}
    />
  );
}
