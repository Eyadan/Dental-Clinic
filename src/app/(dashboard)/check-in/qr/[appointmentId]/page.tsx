import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { QrDisplay } from "./qr-display";

export default async function QrCodePage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select(`
      id,
      reference_no,
      patients!inner(first_name, last_name)
    `)
    .eq("id", appointmentId)
    .single();

  if (error || !appointment) {
    notFound();
  }

  const patient = appointment.patients as unknown as { first_name: string; last_name: string };
  const patientName = `${patient.first_name} ${patient.last_name}`;
  const registrationUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/register`;

  return (
    <QrDisplay
      appointmentId={appointmentId}
      patientName={patientName}
      referenceNo={appointment.reference_no}
      registrationUrl={registrationUrl}
    />
  );
}
