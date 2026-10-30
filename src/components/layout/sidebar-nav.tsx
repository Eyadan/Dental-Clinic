"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavItemsForRole } from "@/lib/constants/navigation";
import type { UserRole } from "@/lib/types/enums";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useUnreadMessagesCount } from "@/lib/hooks/use-unread-messages";

interface SidebarNavProps {
  role: UserRole;
  collapsed?: boolean;
}

export function SidebarNav({ role, collapsed = false }: SidebarNavProps) {
  const pathname = usePathname();
  const items = getNavItemsForRole(role);
  const { unreadCount } = useUnreadMessagesCount();

  return (
    <TooltipProvider delay={0}>
      <nav className={cn("flex flex-col gap-1.5", collapsed ? "p-2" : "p-3")} aria-label="Main navigation">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          const isChat = item.href === "/chat";
          const showChatBadge = isChat && unreadCount > 0;

          const linkContent = (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "group relative flex h-10.5 items-center rounded-xl text-xs font-semibold transition-all duration-200",
                collapsed ? "justify-center px-0" : "gap-3 px-3.5",
                isActive
                  ? "bg-gradient-to-r from-cyan-500/15 to-teal-500/5 text-cyan-600 dark:text-cyan-400 font-bold shadow-xs border border-cyan-500/25 border-l-3 border-l-cyan-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative shrink-0 flex items-center justify-center">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                    isActive ? "text-cyan-600 dark:text-cyan-400" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {collapsed && showChatBadge && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
                  </span>
                )}
              </div>
              {!collapsed && (
                <>
                  <span className="truncate flex-1">{item.label}</span>
                  {showChatBadge && (
                    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white font-black text-[10px] shadow-xs shadow-red-600/40">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={linkContent} />
                <TooltipContent side="right" sideOffset={8}>
                  <div className="flex items-center gap-1.5">
                    <span>{item.label}</span>
                    {showChatBadge && (
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-red-600 text-white font-bold text-[10px]">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>
    </TooltipProvider>
  );
}
