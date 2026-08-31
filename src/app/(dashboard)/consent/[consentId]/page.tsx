import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { ConsentSigningClient } from "./consent-signing-client";

export default async function ConsentPage({
  params,
}: {
  params: Promise<{ consentId: string }>;
}) {
  const { consentId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: consent, error } = await supabase
    .from("consent_forms")
    .select(`
      id,
      treatment_info,
      consent_version,
      signed_at,
      signature_image_url,
      appointment_id,
      appointments(patients(first_name, last_name))
    `)
    .eq("id", consentId)
    .single();

  if (error || !consent) {
    notFound();
  }

  const patient = (consent.appointments as unknown as {
    patients: { first_name: string; last_name: string };
  }).patients;

  const { data: formClauses } = await supabase
    .from("consent_form_clauses")
    .select("id, patient_initials, consent_clauses(title, body_text, sort_order)")
    .eq("consent_form_id", consentId);

  const clauses = ((formClauses ?? []) as unknown as Array<{
    id: string;
    patient_initials: string | null;
    consent_clauses: { title: string; body_text: string; sort_order: number };
  }>)
    .sort((a, b) => a.consent_clauses.sort_order - b.consent_clauses.sort_order)
    .map((fc) => ({
      formClauseId: fc.id,
      title: fc.consent_clauses.title,
      bodyText: fc.consent_clauses.body_text,
      patientInitials: fc.patient_initials,
    }));

  return (
    <ConsentSigningClient
      consentId={consent.id}
      treatmentInfo={consent.treatment_info}
      consentVersion={consent.consent_version}
      patientName={`${patient.first_name} ${patient.last_name}`}
      signedAt={consent.signed_at}
      signatureImageUrl={consent.signature_image_url}
      clauses={clauses}
    />
  );
}
