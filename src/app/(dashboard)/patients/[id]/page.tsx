import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { PatientService } from "@/lib/services/patient-service";
import { PatientDetailClient } from "./patient-detail-client";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const service = new PatientService(supabase);
  const patient = await service.getPatientById(id);

  if (!patient) {
    notFound();
  }

  return <PatientDetailClient patient={patient} />;
}
