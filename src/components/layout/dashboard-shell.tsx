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
    <div className="flex h-screen overflow-hidden bg-slate-50/60 dark:bg-[#090d16]">
      <aside
        className={`hidden shrink-0 border-r border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl lg:flex lg:flex-col transition-[width] duration-200 ease-in-out ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div className={`flex h-16 items-center gap-3 border-b border-slate-200/80 dark:border-slate-800/80 ${sidebarCollapsed ? "justify-center px-2" : "px-4"}`}>
          <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950 shadow-md shadow-cyan-500/25 font-bold">
            <Activity className="h-5 w-5 text-slate-950" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-black leading-tight text-slate-900 dark:text-white tracking-tight truncate flex items-center gap-1">
                Smile Dental <Sparkles className="h-3 w-3 text-cyan-500 inline" />
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-none mt-0.5 flex items-center gap-1">
                <RoleIcon className="h-3 w-3 inline shrink-0 text-cyan-500" />
                {roleInfo.label}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-3">
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
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50/40 dark:bg-[#090d16] animate-in fade-in-50 duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}
