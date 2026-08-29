import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { PatientService } from "@/lib/services/patient-service";
import { DentistService } from "@/lib/services/dentist-service";
import { DentalServiceService } from "@/lib/services";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { createAppointmentAction } from "../actions";

export default async function NewAppointmentPage() {
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
        <h1 className="text-2xl font-bold tracking-tight">New Appointment</h1>
        <p className="text-muted-foreground">
          Create a new appointment with patient, dentist, and services
        </p>
      </div>
      <AppointmentForm
        patients={patientsResult.data}
        dentists={dentists}
        services={services}
        onSubmit={createAppointmentAction}
      />
    </div>
  );
}
