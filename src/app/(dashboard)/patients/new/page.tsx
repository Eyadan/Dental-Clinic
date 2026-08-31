import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { PatientService } from "@/lib/services/patient-service";
import { StaffRegistrationForm } from "./staff-registration-form";

export default async function NewPatientPage() {
  const supabase = await createServerSupabaseClient();
  const service = new PatientService(supabase);
  const conditions = await service.getMedicalConditions();

  return <StaffRegistrationForm conditions={conditions} />;
}
