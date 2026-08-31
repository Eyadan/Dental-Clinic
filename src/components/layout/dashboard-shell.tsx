"use client";

import { useState } from "react";
import { Topbar } from "./topbar";
import { SidebarNav } from "./sidebar-nav";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import type { UserRole } from "@/lib/types/enums";
import { Activity, ShieldCheck, UserCheck, Stethoscope, Sparkles } from "lucide-react";

interface DashboardShellProps {
  role: UserRole;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}

export function DashboardShell({ role, userName, userEmail, children }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSignOut = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case "admin":
        return { label: "Admin System", icon: ShieldCheck };
      case "reception":
        return { label: "Reception Desk", icon: UserCheck };
      case "dentist":
        return { label: "Dentist Portal", icon: Stethoscope };
      default:
        return { label: r, icon: Activity };
    }
  };

  const roleInfo = getRoleBadge(role);
  const RoleIcon = roleInfo.icon;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={`hidden shrink-0 border-r border-border/60 bg-card/80 backdrop-blur-md lg:flex lg:flex-col transition-[width] duration-200 ease-in-out ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div className={`flex h-16 items-center gap-3 border-b border-border/60 ${sidebarCollapsed ? "justify-center px-2" : "px-4"}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20">
            <Activity className="h-5 w-5" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-extrabold leading-tight text-foreground tracking-tight truncate flex items-center gap-1">
                Smile Dental <Sparkles className="h-3 w-3 text-cyan-600 inline" />
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground leading-none mt-0.5 flex items-center gap-1">
                <RoleIcon className="h-3 w-3 inline shrink-0 text-cyan-600" />
                {roleInfo.label}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav role={role} collapsed={sidebarCollapsed} />
        </div>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          role={role}
          userName={userName}
          userEmail={userEmail}
          onSignOut={handleSignOut}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-muted/10 animate-in fade-in-50 duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}
