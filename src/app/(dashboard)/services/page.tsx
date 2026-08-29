import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { DentalServiceService } from "@/lib/services";
import { ServicesClient } from "./services-client";

export default async function ServicesPage() {
  const supabase = await createServerSupabaseClient();
  const service = new DentalServiceService(supabase);
  const services = await service.getAllServices();

  return <ServicesClient services={services} />;
}
