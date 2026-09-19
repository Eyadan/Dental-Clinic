import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getServerUserContext } from "@/lib/supabase/user-context";
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

  const supabase = await createServerSupabaseClient();
  const { data: appUser } = await supabase
    .from("users")
    .select("first_name, last_name")
    .eq("id", userId)
    .single();

  if (!appUser) {
    redirect("/login");
  }

  const { data: dentist } = await supabase
    .from("dentists")
    .select("id, specialization")
    .eq("user_id", userId)
    .single();

  if (!dentist) {
    redirect("/unauthorized");
  }

  const fullName = `${appUser.first_name} ${appUser.last_name}`;

  return (
    <DentistPortalShell
      dentistId={dentist.id}
      dentistName={fullName}
      specialization={dentist.specialization}
    >
      {children}
    </DentistPortalShell>
  );
}
