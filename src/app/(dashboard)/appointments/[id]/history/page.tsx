import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { HistoryTimeline } from "@/components/appointments/history-timeline";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function AppointmentHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select(`
      id,
      reference_no,
      patients(first_name, last_name)
    `)
    .eq("id", id)
    .single();

  if (error || !appointment) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>Appointment not found</AlertDescription>
        </Alert>
        <Link href="/appointments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Appointments
          </Button>
        </Link>
      </div>
    );
  }

  const patientData = appointment.patients as unknown as { first_name: string; last_name: string };
  const patientName = `${patientData.first_name} ${patientData.last_name}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/appointments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointment History</h1>
          <p className="text-sm text-muted-foreground">
            {appointment.reference_no} — {patientName}
          </p>
        </div>
      </div>

      <HistoryTimeline appointmentId={id} />
    </div>
  );
}
