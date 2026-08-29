import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { DentistPortalShell } from "@/components/dentist-portal/dentist-portal-shell";

export default async function DentistPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!appUser) {
    redirect("/login");
  }

  if (appUser.role !== "dentist") {
    redirect("/unauthorized");
  }

  const { data: dentist } = await supabase
    .from("dentists")
    .select("id, specialization")
    .eq("user_id", user.id)
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
