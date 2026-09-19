import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getServerUserContext } from "@/lib/supabase/user-context";
import { getCachedDentistSchedules } from "@/lib/cache/reference-data";
import { AvailabilityClient } from "./availability-client";
import type { DentistBlock } from "@/lib/types/database";

export default async function AvailabilityPage() {
  const { userId } = await getServerUserContext();
  if (!userId) return null;

  const supabase = await createServerSupabaseClient();
  const [{ data: dentist }, { data: userData }] = await Promise.all([
    supabase
      .from("dentists")
      .select("id, specialization")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", userId)
      .single(),
  ]);

  if (!dentist) return null;

  const [schedules, { data: blocks }] = await Promise.all([
    getCachedDentistSchedules(dentist.id),
    supabase
      .from("dentist_blocks")
      .select("*")
      .eq("dentist_id", dentist.id)
      .order("start_datetime", { ascending: true }),
  ]);

  const dentistName = userData ? `${userData.first_name} ${userData.last_name}` : "Unknown";

  return (
    <AvailabilityClient
      dentistId={dentist.id}
      dentistName={dentistName}
      schedules={schedules}
      blocks={(blocks ?? []) as unknown as DentistBlock[]}
    />
  );
}
