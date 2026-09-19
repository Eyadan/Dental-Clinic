import { getCachedMedicalConditions } from "@/lib/cache/reference-data";
import { StaffRegistrationForm } from "./staff-registration-form";

export default async function NewPatientPage() {
  const conditions = await getCachedMedicalConditions();

  return <StaffRegistrationForm conditions={conditions} />;
}
