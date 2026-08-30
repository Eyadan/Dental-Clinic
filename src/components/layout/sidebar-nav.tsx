"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavItemsForRole } from "@/lib/constants/navigation";
import type { UserRole } from "@/lib/types/enums";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  role: UserRole;
}

export function SidebarNav({ role }: SidebarNavProps) {
  const pathname = usePathname();
  const items = getNavItemsForRole(role);

  return (
    <nav className="flex flex-col gap-1.5 p-3" aria-label="Main navigation">
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex h-10 items-center gap-3 rounded-xl px-3.5 text-xs font-semibold transition-all duration-200",
              isActive
                ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold shadow-xs border border-cyan-500/20"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                isActive ? "text-cyan-600 dark:text-cyan-400" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
