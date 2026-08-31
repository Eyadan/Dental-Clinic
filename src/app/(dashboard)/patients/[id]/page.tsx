import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { PatientService } from "@/lib/services/patient-service";
import { DentalChartService } from "@/lib/services/dental-chart-service";
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

  const [medicalRecord, conditions, conditionIds] = await Promise.all([
    service.getMedicalRecord(id),
    service.getMedicalConditions(),
    service.getPatientConditionIds(id),
  ]);

  const dentalChartService = new DentalChartService(supabase);
  const { chart: dentalChart, presence: dentalChartPresence, findings: dentalChartFindings } = await dentalChartService.getFullChart(id);

  return (
    <PatientDetailClient
      patient={patient}
      medicalRecord={medicalRecord}
      conditions={conditions}
      conditionIds={conditionIds}
      dentalChart={dentalChart}
      dentalChartPresence={dentalChartPresence}
      dentalChartFindings={dentalChartFindings}
    />
  );
}
