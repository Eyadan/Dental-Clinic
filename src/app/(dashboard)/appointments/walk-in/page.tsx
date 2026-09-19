import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getServerUserContext } from "@/lib/supabase/user-context";
import { getCachedActiveDentalServices, getCachedDentists } from "@/lib/cache/reference-data";
import { PatientService } from "@/lib/services/patient-service";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { createWalkInAction } from "./actions";

export default async function WalkInPage() {
  const supabase = await createServerSupabaseClient();
  const patientService = new PatientService(supabase);

  const { userId, role: userRole } = await getServerUserContext();
  let currentDentistId: string | null = null;

  if (userRole === "dentist" && userId) {
    const { data: dentist } = await supabase.from("dentists").select("id").eq("user_id", userId).single();
    currentDentistId = dentist?.id ?? null;
  }

  const [patientsResult, dentists, services] = await Promise.all([
    patientService.getPatients({ query: "", page: 1, pageSize: 100 }),
    getCachedDentists(),
    getCachedActiveDentalServices(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Walk-In Visit</h1>
        <p className="text-muted-foreground">
          Create an immediate appointment — patient is checked in automatically
        </p>
      </div>
      <AppointmentForm
        patients={patientsResult.data}
        dentists={dentists}
        services={services}
        onSubmit={createWalkInAction}
        currentUserRole={userRole}
        currentDentistId={currentDentistId}
      />
    </div>
  );
}
