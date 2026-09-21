import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getCachedDentistSchedules } from "@/lib/cache/reference-data";
import { DentistService } from "@/lib/services/dentist-service";
import { ScheduleClient } from "./schedule-client";

export default async function DentistSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const service = new DentistService(supabase);
  const dentist = await service.getDentistById(id);

  if (!dentist) {
    notFound();
  }

  const [{ data: { user } }, schedules, blocks] = await Promise.all([
    supabase.auth.getUser(),
    getCachedDentistSchedules(id),
    service.getBlocks(id),
  ]);

  const isOwnDentist = dentist.user_id === user?.id;

  return (
    <ScheduleClient
      dentist={dentist}
      schedules={schedules}
      blocks={blocks}
      isOwnDentist={isOwnDentist}
    />
  );
}
