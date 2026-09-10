import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { PatientService } from "@/lib/services/patient-service";
import { DentistService } from "@/lib/services/dentist-service";
import { DentalServiceService } from "@/lib/services";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { createAppointmentAction } from "../actions";
import { CalendarCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function NewAppointmentPage() {
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
      {/* BRANDED HERO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Book New Patient Appointment</h1>
              <Badge variant="outline" className="border-border text-foreground font-mono text-[10px]">
                Booking Form
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Schedule a dental appointment, link procedures, select dentist, and pick time slots</p>
          </div>
        </div>
      </div>

      <AppointmentForm
        patients={patientsResult.data}
        dentists={dentists}
        services={services}
        onSubmit={createAppointmentAction}
        currentUserRole={userRole}
        currentDentistId={currentDentistId}
      />
    </div>
  );
}
