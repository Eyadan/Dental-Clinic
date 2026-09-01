import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import { BookingDashboardClient } from "./booking-dashboard-client";

export default async function BookingDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  // Temporary 0.9s delay for skeleton loading state preview
  await new Promise((resolve) => setTimeout(resolve, 900));

  const { status } = await searchParams;
  const supabase = await createServerSupabaseClient();

  const validStatuses = ["all", "pending", "approved", "declined", "expired", "reschedule_required", "pending_cancellation", "rescheduled", "cancelled", "confirmed", "no_show"];
  const filterStatus = status && validStatuses.includes(status) ? status : "pending";

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      reference_no,
      patient_id,
      dentist_id,
      booking_status,
      scheduled_date,
      scheduled_time,
      total_duration,
      created_at,
      patients!inner(first_name, last_name, contact_no)
    `)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch bookings: ${error.message}`);
  }

  const bookings = (appointments ?? []).map((appt: Record<string, unknown>) => {
    const patient = getSingleJoined<{
      first_name: string;
      last_name: string;
      contact_no: string;
    }>(appt.patients);
    return {
      id: appt.id as string,
      reference_no: appt.reference_no as string,
      patient_name: patient ? `${patient.first_name} ${patient.last_name}` : "Unknown Patient",
      patient_contact: patient?.contact_no ?? "",
      booking_status: appt.booking_status as string,
      scheduled_date: appt.scheduled_date as string,
      scheduled_time: appt.scheduled_time as string,
      total_duration: appt.total_duration as number,
      created_at: appt.created_at as string,
    };
  });

  const { data: { user } } = await supabase.auth.getUser();
  let userRole = "reception";
  if (user) {
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
    if (profile) userRole = profile.role;
  }

  return <BookingDashboardClient bookings={bookings} activeFilter={filterStatus} userRole={userRole} />;
}
