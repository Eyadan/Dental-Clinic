"use client";

import { useRouter } from "next/navigation";
import { Topbar } from "./topbar";
import { SidebarNav } from "./sidebar-nav";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import type { UserRole } from "@/lib/types/enums";

interface DashboardShellProps {
  role: UserRole;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}

export function DashboardShell({ role, userName, userEmail, children }: DashboardShellProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-64 shrink-0 border-r lg:block">
        <div className="flex h-16 items-center border-b px-4">
          <span className="text-lg font-semibold">Dental Clinic</span>
        </div>
        <SidebarNav role={role} />
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar role={role} userName={userName} userEmail={userEmail} onSignOut={handleSignOut} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
