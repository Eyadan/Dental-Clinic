import { getCachedAllDentalServices } from "@/lib/cache/reference-data";
import { ServicesClient } from "./services-client";

export default async function ServicesPage() {
  const services = await getCachedAllDentalServices();

  return <ServicesClient services={services} />;
}
