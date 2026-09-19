"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  Search,
  Stethoscope,
  Clock,
  Coins,
  CheckCircle2,
  XCircle,
  Inbox,
  Sparkles,
} from "lucide-react";
import type { DentalService } from "@/lib/types/database";

interface ServiceListProps {
  services: DentalService[];
  onEdit: (service: DentalService) => void;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
}

export function ServiceList({ services, onEdit, onToggleActive }: ServiceListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleToggle = (service: DentalService) => {
    setPendingId(service.id);
    startTransition(async () => {
      await onToggleActive(service.id, !service.is_active);
      setPendingId(null);
    });
  };

  // Metrics
  const totalServices = services.length;
  const activeCount = services.filter((s) => s.is_active).length;
  const inactiveCount = totalServices - activeCount;
  const avgPrice =
    totalServices > 0
      ? services.reduce((acc, s) => acc + Number(s.default_price || 0), 0) / totalServices
      : 0;
  const avgDuration =
    totalServices > 0
      ? Math.round(
          services.reduce((acc, s) => acc + Number(s.default_duration_minutes || 0), 0) / totalServices
        )
      : 0;

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? s.is_active
          : !s.is_active;

      return matchesSearch && matchesStatus;
    });
  }, [services, searchQuery, statusFilter]);

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/50 p-16 text-center shadow-xs">
        <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center mb-3">
          <Stethoscope className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">No dental procedures found</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Click &quot;Add New Procedure&quot; to initialize your clinic catalog with procedures, durations, and pricing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* SUMMARY STATS TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Procedures</p>
            <p className="text-lg font-extrabold font-mono text-foreground mt-0.5">{totalServices}</p>
          </div>
          <div className="h-8 w-8 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
            <Stethoscope className="h-4 w-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Active in Catalog</p>
            <p className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">{activeCount}</p>
          </div>
          <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Average Price</p>
            <p className="text-lg font-extrabold font-mono text-foreground mt-0.5">
              ₱{avgPrice.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="h-8 w-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
            <Coins className="h-4 w-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg Duration</p>
            <p className="text-lg font-extrabold font-mono text-foreground mt-0.5">{avgDuration} mins</p>
          </div>
          <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Clock className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-2 rounded-2xl border border-border/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search procedures by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-muted/20 border-border/60 focus-visible:ring-cyan-500 rounded-xl"
          />
        </div>

        {/* STATUS PILLS */}
        <div className="inline-flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border/60 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all ${
              statusFilter === "all"
                ? "bg-background text-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({totalServices})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all ${
              statusFilter === "active"
                ? "bg-emerald-600 text-white shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all ${
              statusFilter === "inactive"
                ? "bg-slate-700 text-white shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>
      </div>

      {/* PROCEDURES DATA TABLE */}
      {filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-12 text-center shadow-xs">
          <Inbox className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-bold text-foreground">No matching procedures</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            No procedures match your search filter "{searchQuery}".
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="mt-3 h-8 text-xs rounded-xl border-border/80"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40 border-b border-border/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-xs text-foreground py-3 pl-4">Procedure</TableHead>
                <TableHead className="font-bold text-xs text-foreground py-3 hidden md:table-cell">Clinical Description</TableHead>
                <TableHead className="font-bold text-xs text-foreground py-3 w-[130px]">Duration</TableHead>
                <TableHead className="font-bold text-xs text-foreground py-3 w-[140px]">Default Price</TableHead>
                <TableHead className="font-bold text-xs text-foreground py-3 w-[110px]">Status</TableHead>
                <TableHead className="font-bold text-xs text-foreground py-3 text-right pr-4 w-[110px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.map((service) => (
                <TableRow key={service.id} className="hover:bg-muted/30 transition-colors border-b border-border/40">
                  {/* NAME WITH PROCEDURAL BADGE */}
                  <TableCell className="py-3.5 pl-4 font-medium">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20">
                        <Stethoscope className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-foreground leading-tight">{service.name}</p>
                        <p className="text-[10px] text-muted-foreground md:hidden line-clamp-1 mt-0.5">
                          {service.description ?? "Standard procedure"}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* DESCRIPTION */}
                  <TableCell className="py-3.5 text-xs text-muted-foreground max-w-[320px] hidden md:table-cell">
                    <span className="line-clamp-2 leading-relaxed">
                      {service.description || "—"}
                    </span>
                  </TableCell>

                  {/* DURATION PILL */}
                  <TableCell className="py-3.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/40 border border-border/60 text-xs font-mono font-medium text-foreground">
                      <Clock className="h-3 w-3 text-cyan-600" />
                      <span>{service.default_duration_minutes}m</span>
                    </div>
                  </TableCell>

                  {/* DEFAULT PRICE */}
                  <TableCell className="py-3.5 font-mono">
                    <span className="font-extrabold text-xs text-foreground bg-cyan-500/5 px-2 py-1 rounded-lg border border-cyan-500/20 text-cyan-700 dark:text-cyan-300">
                      ₱{Number(service.default_price).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </TableCell>

                  {/* STATUS BADGE */}
                  <TableCell className="py-3.5">
                    {service.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        Inactive
                      </span>
                    )}
                  </TableCell>

                  {/* ACTIONS: QUICK EDIT BUTTON + DROPDOWN */}
                  <TableCell className="py-3.5 text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(service)}
                        className="h-8 px-2.5 rounded-xl border-border/80 text-xs font-semibold hover:bg-cyan-500/10 hover:text-cyan-600 hover:border-cyan-500/30"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={pendingId === service.id}
                              className="h-8 w-8 rounded-xl border-transparent hover:border-border/80"
                            >
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="rounded-xl shadow-lg border-border/80 text-xs">
                          <DropdownMenuItem
                            onClick={() => handleToggle(service)}
                            className={service.is_active ? "text-destructive font-medium" : "text-emerald-600 font-medium"}
                          >
                            {service.is_active ? (
                              <>
                                <PowerOff className="mr-2 h-3.5 w-3.5" />
                                Deactivate Procedure
                              </>
                            ) : (
                              <>
                                <Power className="mr-2 h-3.5 w-3.5" />
                                Activate Procedure
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
