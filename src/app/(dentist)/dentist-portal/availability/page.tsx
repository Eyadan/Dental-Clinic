import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { AvailabilityClient } from "./availability-client";
import type { DentistSchedule, DentistBlock } from "@/lib/types/database";

export default async function AvailabilityPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: dentist } = await supabase
    .from("dentists")
    .select("id, specialization")
    .eq("user_id", user.id)
    .single();

  if (!dentist) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  const { data: schedules } = await supabase
    .from("dentist_schedules")
    .select("*")
    .eq("dentist_id", dentist.id)
    .order("day_of_week", { ascending: true });

  const { data: blocks } = await supabase
    .from("dentist_blocks")
    .select("*")
    .eq("dentist_id", dentist.id)
    .order("start_datetime", { ascending: true });

  const dentistName = userData ? `${userData.first_name} ${userData.last_name}` : "Unknown";

  return (
    <AvailabilityClient
      dentistId={dentist.id}
      dentistName={dentistName}
      schedules={(schedules ?? []) as unknown as DentistSchedule[]}
      blocks={(blocks ?? []) as unknown as DentistBlock[]}
    />
  );
}
