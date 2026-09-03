import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { PatientService } from "@/lib/services/patient-service";
import { DentistService } from "@/lib/services/dentist-service";
import { DentalServiceService } from "@/lib/services";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { createWalkInAction } from "./actions";

export default async function WalkInPage() {
  const supabase = await createServerSupabaseClient();
  const patientService = new PatientService(supabase);
  const dentistService = new DentistService(supabase);
  const dentalServiceService = new DentalServiceService(supabase);

  const { data: { user } } = await supabase.auth.getUser();
  let userRole: string | null = null;
  let currentDentistId: string | null = null;

  if (user) {
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    userRole = profile?.role ?? null;

    if (userRole === "dentist") {
      const { data: dentist } = await supabase.from("dentists").select("id").eq("user_id", user.id).single();
      currentDentistId = dentist?.id ?? null;
    }
  }

  const [patientsResult, dentists, services] = await Promise.all([
    patientService.getPatients({ query: "", page: 1, pageSize: 100 }),
    dentistService.getAllDentists(),
    dentalServiceService.getServices(),
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
