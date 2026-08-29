import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import { ConsentListClient } from "./consent-list-client";

interface ConsentListItem {
  consentId: string;
  patientName: string;
  treatmentInfo: string;
  consentVersion: string;
  signedAt: string | null;
  createdAt: string;
}

export default async function ConsentListPage() {
  const supabase = await createServerSupabaseClient();

  const { data: consents, error } = await supabase
    .from("consent_forms")
    .select(`
      id,
      treatment_info,
      consent_version,
      signed_at,
      created_at,
      appointments(patients(first_name, last_name))
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Failed to load consent forms.</p>
      </div>
    );
  }

  const items: ConsentListItem[] = (consents ?? []).map((consent: Record<string, unknown>) => {
    const appt = consent.appointments as unknown as Record<string, unknown> | null;
    const patient = appt ? getSingleJoined<{ first_name: string; last_name: string }>(appt.patients) : null;
    return {
      consentId: consent.id as string,
      patientName: patient ? `${patient.first_name} ${patient.last_name}` : "Unknown",
      treatmentInfo: consent.treatment_info as string,
      consentVersion: consent.consent_version as string,
      signedAt: consent.signed_at as string | null,
      createdAt: consent.created_at as string,
    };
  });

  return <ConsentListClient items={items} />;
}
