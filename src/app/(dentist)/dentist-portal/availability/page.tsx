import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getServerUserContext } from "@/lib/supabase/user-context";
import { getCachedDentists, getCachedDentistSchedules } from "@/lib/cache/reference-data";
import { AvailabilityClient } from "./availability-client";
import type { DentistBlock } from "@/lib/types/database";

export default async function AvailabilityPage() {
  const { userId } = await getServerUserContext();
  if (!userId) return null;

  const dentists = await getCachedDentists();
  const dentist = dentists.find((d) => d.user_id === userId);
  if (!dentist) return null;

  const supabase = await createServerSupabaseClient();
  const [schedules, { data: blocks }] = await Promise.all([
    getCachedDentistSchedules(dentist.id),
    supabase
      .from("dentist_blocks")
      .select("*")
      .eq("dentist_id", dentist.id)
      .order("start_datetime", { ascending: true }),
  ]);

  return (
    <AvailabilityClient
      dentistId={dentist.id}
      dentistName={dentist.full_name || "Unknown"}
      schedules={schedules}
      blocks={(blocks ?? []) as unknown as DentistBlock[]}
    />
  );
}
