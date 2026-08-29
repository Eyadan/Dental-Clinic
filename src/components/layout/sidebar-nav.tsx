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
    <nav className="flex flex-col gap-1 p-3" aria-label="Main navigation">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
