import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { PatientService } from "@/lib/services/patient-service";
import { PatientsClient } from "./patients-client";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const service = new PatientService(supabase);

  const result = await service.getPatients({
    query: q ?? "",
    page: 1,
    pageSize: 50,
  });

  return <PatientsClient initialPatients={result.data} totalCount={result.total} />;
}
