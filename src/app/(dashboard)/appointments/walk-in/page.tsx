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
      />
    </div>
  );
}
