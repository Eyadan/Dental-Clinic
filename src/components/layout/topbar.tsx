"use client";

import { useState } from "react";
import { Menu, LogOut, ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import type { UserRole } from "@/lib/types/enums";

interface TopbarProps {
  role: UserRole;
  userName: string;
  userEmail: string;
  onSignOut: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function Topbar({ role, userName, userEmail, onSignOut, sidebarCollapsed = false, onToggleSidebar }: TopbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl px-4 lg:px-6 z-20">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            onClick={onToggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4.5 w-4.5" />
            ) : (
              <PanelLeftClose className="h-4.5 w-4.5" />
            )}
          </Button>
        )}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 rounded-xl" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            }
          />
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-16 items-center border-b px-4">
              <span className="text-base font-bold">Dental Clinic</span>
            </div>
            <SidebarNav role={role} />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200 hidden sm:inline-block">Dental Clinic Management System</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="flex items-center gap-2.5 h-10 px-3 rounded-xl border border-slate-200/70 dark:border-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              <Avatar className="h-7.5 w-7.5 border border-cyan-500/30">
                <AvatarFallback className="bg-gradient-to-tr from-cyan-500 to-teal-500 text-slate-950 font-extrabold text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold leading-tight text-slate-900 dark:text-white">{userName}</span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold leading-none capitalize">{role}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{userName}</span>
                <span className="text-xs text-muted-foreground">{userEmail}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
