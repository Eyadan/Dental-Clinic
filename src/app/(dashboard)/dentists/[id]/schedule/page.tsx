import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
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

  const [schedules, blocks] = await Promise.all([
    service.getSchedules(id),
    service.getBlocks(id),
  ]);

  return <ScheduleClient dentist={dentist} schedules={schedules} blocks={blocks} />;
}
