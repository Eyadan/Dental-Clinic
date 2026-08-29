"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ListOrdered, MoreHorizontal, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

interface DentistPortalShellProps {
  dentistId: string;
  dentistName: string;
  specialization: string | null;
  children: React.ReactNode;
}

const TABS = [
  { href: "/dentist-portal", label: "Schedule", icon: CalendarDays },
  { href: "/dentist-portal/queue", label: "Queue", icon: ListOrdered },
  { href: "/dentist-portal/more", label: "More", icon: MoreHorizontal },
];

export function DentistPortalShell({
  dentistId,
  dentistName,
  specialization,
  children,
}: DentistPortalShellProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold leading-tight">{dentistName}</p>
              {specialization && (
                <p className="text-xs text-muted-foreground leading-tight">{specialization}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background">
        <div className="mx-auto flex max-w-md items-stretch">
          {TABS.map((tab) => {
            const isActive =
              tab.href === "/dentist-portal"
                ? pathname === "/dentist-portal"
                : pathname.startsWith(tab.href);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
                style={{ minHeight: "56px" }}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
