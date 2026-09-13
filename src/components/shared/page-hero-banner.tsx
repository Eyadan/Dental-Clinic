"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

interface PageHeroBannerProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badgeText?: string;
  children?: React.ReactNode;
}

export function PageHeroBanner({
  icon: Icon,
  title,
  description,
  badgeText,
  children,
}: PageHeroBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card border border-border/80 p-5 shadow-xs transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-2xs">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
              {badgeText && (
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 text-[10px] font-bold uppercase tracking-wider font-mono">
                  {badgeText}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
      </div>
    </div>
  );
}
