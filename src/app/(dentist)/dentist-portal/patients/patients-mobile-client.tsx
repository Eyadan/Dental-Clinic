"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { parseAllergies } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/lib/hooks/use-debounce";
import {
  Users,
  Search,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  ArrowUpRight,
  Stethoscope,
  Loader2,
  X,
} from "lucide-react";
import type { Patient } from "@/lib/types/database";

export interface MobilePatientItem extends Patient {
  isTodayPatient?: boolean;
  scheduledTime?: string | null;
}

interface PatientsMobileClientProps {
  initialPatients: MobilePatientItem[];
  totalCount: number;
  dentistName: string;
}

type FilterTab = "all" | "today" | "alerts";

export function PatientsMobileClient({
  initialPatients,
  totalCount,
  dentistName,
}: PatientsMobileClientProps) {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<MobilePatientItem[]>(initialPatients);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const debouncedQuery = useDebounce(query, 300);

  // Search effect
  const handleSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setPatients(initialPatients);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/patients/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.patients)) {
        const todayMap = new Map(
          initialPatients.filter((p) => p.isTodayPatient).map((p) => [p.id, p.scheduledTime]),
        );
        const mapped: MobilePatientItem[] = data.patients.map((p: Patient) => ({
          ...p,
          isTodayPatient: todayMap.has(p.id),
          scheduledTime: todayMap.get(p.id) ?? null,
        }));
        setPatients(mapped);
      }
    } catch {
      // Retain current state on error
    } finally {
      setIsLoading(false);
    }
  }, [initialPatients]);

  // Trigger search when debounced query changes
  useState(() => {
    // Initial mount sync
  });

  const onSearchChange = (val: string) => {
    setQuery(val);
    handleSearch(val);
  };

  const clearSearch = () => {
    setQuery("");
    setPatients(initialPatients);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  };

  const calculateAge = (birthDateStr?: string | null) => {
    if (!birthDateStr) return null;
    const birth = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const todayCount = useMemo(
    () => initialPatients.filter((p) => p.isTodayPatient).length,
    [initialPatients],
  );

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      if (activeFilter === "today") {
        return Boolean(patient.isTodayPatient);
      }
      if (activeFilter === "alerts") {
        const list = parseAllergies(patient.allergies);
        return list.length > 0;
      }
      return true;
    });
  }, [patients, activeFilter]);

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      {/* Mobile Station Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            Patient Records
          </h1>
          <Badge variant="outline" className="border-cyan-500/30 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 font-mono text-[11px] font-bold">
            {totalCount} Total
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Mobile patient files directory for Dr. {dentistName}. Access past charts, medical history, and clinical notes.
        </p>
      </div>

      {/* Instant Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search past or current patients..."
          className="pl-9 pr-9 h-11 rounded-xl text-sm bg-card border-border/80 shadow-xs focus-visible:ring-cyan-500"
          aria-label="Search patients"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Quick Filter Segmented Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
            activeFilter === "all"
              ? "bg-cyan-600 text-white shadow-xs font-bold"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          }`}
          style={{ minHeight: "36px" }}
        >
          All Patients ({patients.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("today")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
            activeFilter === "today"
              ? "bg-cyan-600 text-white shadow-xs font-bold"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          }`}
          style={{ minHeight: "36px" }}
        >
          <Clock className="h-3.5 w-3.5" />
          Today's Appointments ({todayCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("alerts")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
            activeFilter === "alerts"
              ? "bg-amber-600 text-white shadow-xs font-bold"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          }`}
          style={{ minHeight: "36px" }}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Medical Alerts
        </button>
      </div>

      {/* Patient Cards List */}
      <div className="space-y-3">
        {filteredPatients.length === 0 ? (
          <Card className="border border-dashed border-border/80 bg-card rounded-2xl">
            <CardContent className="p-8 text-center space-y-2">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-bold text-foreground">No Patients Found</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {query
                  ? `No matching patient file for "${query}". Try searching by phone number or last name.`
                  : "No patients match the selected filter."}
              </p>
              {query && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSearch}
                  className="mt-2 text-xs rounded-xl"
                  style={{ minHeight: "40px" }}
                >
                  Clear Search Filter
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPatients.map((patient) => {
            const age = calculateAge(patient.birth_date);
            const allergyList = parseAllergies(patient.allergies);
            const hasAllergies = allergyList.length > 0;

            return (
              <Card
                key={patient.id}
                className="overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs transition-shadow hover:shadow-md"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header Row: Initials Avatar + Name + Tags */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-bold text-sm tracking-wider">
                        {getInitials(patient.first_name, patient.last_name)}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/patients/${patient.id}`}
                          className="font-bold text-sm text-foreground hover:text-cyan-600 transition-colors block truncate"
                        >
                          {patient.first_name} {patient.last_name}
                        </Link>
                        <p className="text-[11px] font-mono text-muted-foreground truncate">
                          ID: #{patient.id.slice(0, 8).toUpperCase()}
                          {age !== null && ` · ${age} yrs`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {patient.isTodayPatient ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                          Today {patient.scheduledTime ? `· ${patient.scheduledTime}` : ""}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
                          Past Patient
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Contact Row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs pt-0.5 border-t border-border/40">
                    <a
                      href={`tel:${patient.contact_no}`}
                      className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
                      style={{ minHeight: "32px" }}
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {patient.contact_no}
                    </a>
                    {patient.email && (
                      <span className="flex items-center gap-1.5 text-muted-foreground truncate max-w-[200px]">
                        <Mail className="h-3 w-3 shrink-0" />
                        {patient.email}
                      </span>
                    )}
                  </div>

                  {/* Medical Alerts Banner */}
                  {hasAllergies ? (
                    <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span className="text-[11px] font-bold truncate">
                        Allergies: {allergyList.join(", ")}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>No known medical allergies</span>
                    </div>
                  )}

                  {/* Direct Action Link */}
                  <div className="pt-1">
                    <Link href={`/patients/${patient.id}`} className="block">
                      <Button
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2"
                        style={{ minHeight: "44px" }}
                      >
                        <FileText className="h-4 w-4" />
                        Open Patient File & Dental Chart
                        <ArrowUpRight className="h-3.5 w-3.5 ml-auto" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
