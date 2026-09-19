import { redirect } from "next/navigation";
import { getServerUserContext } from "@/lib/supabase/user-context";
import { getCachedDentists } from "@/lib/cache/reference-data";
import { DentistPortalShell } from "@/components/dentist-portal/dentist-portal-shell";

export default async function DentistPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, role } = await getServerUserContext();

  if (!userId) {
    redirect("/login");
  }

  if (role !== "dentist") {
    redirect("/unauthorized");
  }

  const dentists = await getCachedDentists();
  const dentist = dentists.find((d) => d.user_id === userId);

  if (!dentist) {
    redirect("/unauthorized");
  }

  return (
    <DentistPortalShell
      dentistId={dentist.id}
      dentistName={dentist.full_name || "Unknown"}
      specialization={dentist.specialization}
    >
      {children}
    </DentistPortalShell>
  );
}
