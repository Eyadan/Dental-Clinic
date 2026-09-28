"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

interface PageHeroBannerProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badgeText?: string;
  badgeVariant?: "default" | "danger" | "success" | "warning";
  children?: React.ReactNode;
}

export function PageHeroBanner({
  icon: Icon,
  title,
  description,
  badgeText,
  badgeVariant = "default",
  children,
}: PageHeroBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card border border-border/80 p-5 shadow-xs transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-2xs">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground truncate">{title}</h1>
              {badgeText && (
                <Badge
                  variant={badgeVariant === "danger" ? "default" : "outline"}
                  className={
                    badgeVariant === "danger"
                      ? "border-transparent bg-red-600 hover:bg-red-600 text-white font-black text-[11px] shadow-md shadow-red-500/50 uppercase tracking-wider shrink-0 whitespace-nowrap px-2.5 py-0.5"
                      : "border-cyan-500/30 text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 text-[10px] font-bold uppercase tracking-wider font-mono shrink-0 whitespace-nowrap"
                  }
                >
                  {badgeText}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
          </div>
        </div>
        {children && <div className="flex items-center gap-2 flex-wrap shrink-0">{children}</div>}
      </div>
    </div>
  );
}
