"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { parseAllergies } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Stethoscope,
  FileCheck,
  FileText,
  Search,
  Clock,
  User,
  Activity,
  AlertTriangle,
  ArrowRight,
  Phone,
  CheckCircle2,
  PauseCircle,
} from "lucide-react";

export interface ConsultationListItem {
  appointmentId: string;
  referenceNo: string;
  patientName: string;
  patientPhone?: string | null;
  patientAllergies?: string | null;
  dentistName?: string | null;
  scheduledTime: string;
  visitStatus: string | null;
  services?: string[];
  hasConsent: boolean;
  isConsentSigned?: boolean;
}

interface ConsultationListClientProps {
  items: ConsultationListItem[];
}

const VISIT_STATUS_CONFIG: Record<
  string,
  { label: string; style: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  checked_in: {
    label: "Checked In",
    style: "border-blue-500/30 text-blue-600 bg-blue-500/10",
    border: "border-l-blue-500",
    icon: Clock,
  },
  waiting: {
    label: "Waiting",
    style: "border-blue-500/30 text-blue-600 bg-blue-500/10",
    border: "border-l-blue-500",
    icon: Clock,
  },
  in_consultation: {
    label: "In Consultation",
    style: "border-cyan-500/40 text-cyan-600 bg-cyan-500/10 font-bold",
    border: "border-l-cyan-500",
    icon: Stethoscope,
  },
  treatment_ongoing: {
    label: "Treatment Ongoing",
    style: "border-amber-500/40 text-amber-600 bg-amber-500/10 font-bold",
    border: "border-l-amber-500",
    icon: Activity,
  },
  treatment_paused: {
    label: "Treatment Paused",
    style: "border-rose-500/40 text-rose-600 bg-rose-500/10 font-bold",
    border: "border-l-rose-500",
    icon: PauseCircle,
  },
  consent_signed: {
    label: "Consent Signed",
    style: "border-emerald-500/40 text-emerald-600 bg-emerald-500/10 font-bold",
    border: "border-l-emerald-500",
    icon: CheckCircle2,
  },
};

const MOCK_CONSULTATIONS: ConsultationListItem[] = [
  {
    appointmentId: "demo-appt-1",
    referenceNo: "REF-20260903-01",
    patientName: "Ana Patricia Lim",
    patientPhone: "+63 917 123 4567",
    patientAllergies: "Penicillin, Latex",
    dentistName: "Dr. John Doe",
    scheduledTime: "10:30 AM",
    visitStatus: "in_consultation",
    services: ["Dental Checkup", "Tooth Extraction"],
    hasConsent: true,
    isConsentSigned: true,
  },
  {
    appointmentId: "demo-appt-2",
    referenceNo: "REF-20260903-02",
    patientName: "Pedro Reyes",
    patientPhone: "+63 918 987 6543",
    patientAllergies: null,
    dentistName: "Dr. Jane Smith",
    scheduledTime: "11:15 AM",
    visitStatus: "checked_in",
    services: ["Teeth Cleaning (Prophylaxis)"],
    hasConsent: false,
    isConsentSigned: false,
  },
  {
    appointmentId: "demo-appt-3",
    referenceNo: "REF-20260903-03",
    patientName: "Maria Clara Santos",
    patientPhone: "+63 920 555 1234",
    patientAllergies: "Aspirin",
    dentistName: "Dr. John Doe",
    scheduledTime: "02:00 PM",
    visitStatus: "treatment_ongoing",
    services: ["Composite Filling"],
    hasConsent: true,
    isConsentSigned: true,
  },
];

export function ConsultationListClient({ items }: ConsultationListClientProps) {
  const effectiveItems = items.length > 0 ? items : MOCK_CONSULTATIONS;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "in_consultation" | "treatment_ongoing" | "waiting">("all");

  const counts = useMemo(() => {
    return {
      total: effectiveItems.length,
      inConsultation: effectiveItems.filter((i) => i.visitStatus === "in_consultation").length,
      treatmentOngoing: effectiveItems.filter((i) => i.visitStatus === "treatment_ongoing").length,
      consentSigned: effectiveItems.filter((i) => i.isConsentSigned).length,
    };
  }, [effectiveItems]);

  const filteredItems = useMemo(() => {
    return effectiveItems.filter((item) => {
      const status = item.visitStatus ?? "waiting";
      if (statusTab === "in_consultation" && status !== "in_consultation") return false;
      if (statusTab === "treatment_ongoing" && status !== "treatment_ongoing") return false;
      if (statusTab === "waiting" && (status === "in_consultation" || status === "treatment_ongoing")) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      const allergiesStr = item.patientAllergies ?? "";
      const servicesStr = (item.services ?? []).join(" ");
      return (
        item.patientName.toLowerCase().includes(query) ||
        item.referenceNo.toLowerCase().includes(query) ||
        (item.dentistName ?? "").toLowerCase().includes(query) ||
        allergiesStr.toLowerCase().includes(query) ||
        servicesStr.toLowerCase().includes(query)
      );
    });
  }, [effectiveItems, searchQuery, statusTab]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* BRANDED HERO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Clinical Consultation Desk</h1>
              <Badge variant="outline" className="border-cyan-500/30 text-cyan-600 font-mono text-[10px] uppercase font-bold">
                {counts.total} Active Queue
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              Real-time patient treatment workspace, dental charting, and clinical logs
            </p>
          </div>
        </div>
      </div>

      {/* KPI DASHBOARD SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border border-border/70 bg-card rounded-2xl shadow-2xs p-3.5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 shrink-0">
              <Stethoscope className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Total Queue</p>
              <p className="text-lg font-bold font-mono text-foreground">{counts.total}</p>
            </div>
          </div>
        </Card>

        <Card className="border border-border/70 bg-card rounded-2xl shadow-2xs p-3.5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 shrink-0">
              <Stethoscope className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">In Consultation</p>
              <p className="text-lg font-bold font-mono text-cyan-600">{counts.inConsultation}</p>
            </div>
          </div>
        </Card>

        <Card className="border border-border/70 bg-card rounded-2xl shadow-2xs p-3.5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Ongoing Treatment</p>
              <p className="text-lg font-bold font-mono text-amber-600">{counts.treatmentOngoing}</p>
            </div>
          </div>
        </Card>

        <Card className="border border-border/70 bg-card rounded-2xl shadow-2xs p-3.5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
              <FileCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Signed Waivers</p>
              <p className="text-lg font-bold font-mono text-emerald-600">{counts.consentSigned}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* SEARCH BAR & STATUS FILTER TABS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search patient name, reference #, procedure, or dentist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs border-border/80 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Button
            size="sm"
            variant={statusTab === "all" ? "default" : "outline"}
            onClick={() => setStatusTab("all")}
            className={`h-8 text-xs rounded-xl px-3 font-semibold ${
              statusTab === "all" ? "bg-cyan-600 text-white hover:bg-cyan-700" : "border-border/80"
            }`}
          >
            All Queue ({counts.total})
          </Button>
          <Button
            size="sm"
            variant={statusTab === "in_consultation" ? "default" : "outline"}
            onClick={() => setStatusTab("in_consultation")}
            className={`h-8 text-xs rounded-xl px-3 font-semibold ${
              statusTab === "in_consultation" ? "bg-cyan-600 text-white hover:bg-cyan-700" : "border-border/80"
            }`}
          >
            In Consultation ({counts.inConsultation})
          </Button>
          <Button
            size="sm"
            variant={statusTab === "treatment_ongoing" ? "default" : "outline"}
            onClick={() => setStatusTab("treatment_ongoing")}
            className={`h-8 text-xs rounded-xl px-3 font-semibold ${
              statusTab === "treatment_ongoing" ? "bg-cyan-600 text-white hover:bg-cyan-700" : "border-border/80"
            }`}
          >
            Ongoing ({counts.treatmentOngoing})
          </Button>
          <Button
            size="sm"
            variant={statusTab === "waiting" ? "default" : "outline"}
            onClick={() => setStatusTab("waiting")}
            className={`h-8 text-xs rounded-xl px-3 font-semibold ${
              statusTab === "waiting" ? "bg-cyan-600 text-white hover:bg-cyan-700" : "border-border/80"
            }`}
          >
            Waiting
          </Button>
        </div>
      </div>

      {/* PATIENT CONSULTATION QUEUE CARDS */}
      {filteredItems.length === 0 ? (
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs py-12 text-center">
          <CardContent className="space-y-3">
            <Stethoscope className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-bold text-foreground">No Patients Found in Consultation Queue</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No patient records match your filter criteria or search query.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const statusKey = item.visitStatus ?? "waiting";
            const config = VISIT_STATUS_CONFIG[statusKey] ?? VISIT_STATUS_CONFIG.waiting;
            const StatusIcon = config.icon;
            const allergyList = parseAllergies(item.patientAllergies);

            return (
              <Link key={item.appointmentId} href={`/consultation/${item.appointmentId}`} className="block group">
                <Card
                  className="border border-border/80 bg-card rounded-2xl shadow-2xs hover:shadow-md hover:border-cyan-500/40 transition-all duration-200"
                >
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* LEFT COLUMN: PATIENT INFO & AVATAR */}
                    <div className="flex items-start md:items-center gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white font-bold text-sm shadow-xs font-mono">
                        {getInitials(item.patientName)}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-foreground group-hover:text-cyan-600 transition-colors">
                            {item.patientName}
                          </p>
                          <Badge variant="outline" className="border-border text-muted-foreground font-mono text-[10px]">
                            {item.referenceNo}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                            <Clock className="h-3 w-3 text-cyan-600" /> {item.scheduledTime}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {item.dentistName && (
                            <span className="flex items-center gap-1 text-[11px] font-medium font-mono text-foreground">
                              <User className="h-3 w-3 text-teal-600" /> {item.dentistName}
                            </span>
                          )}
                          {item.patientPhone && (
                            <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                              <Phone className="h-3 w-3 text-muted-foreground" /> {item.patientPhone}
                            </span>
                          )}
                        </div>

                        {/* REQUESTED PROCEDURES */}
                        {item.services && item.services.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {item.services.map((svc, idx) => (
                              <Badge key={idx} variant="outline" className="border-border/80 bg-muted/30 text-[10px] text-foreground font-medium">
                                {svc}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* ALLERGY ALERT BADGES */}
                        {allergyList.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {allergyList.map((allergy, idx) => (
                              <Badge key={idx} variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10 text-[10px] font-bold">
                                <AlertTriangle className="mr-1 h-3 w-3 shrink-0" /> {allergy}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: STATUS BADGES & ACTION BUTTON */}
                    <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-border/40 shrink-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* CONSENT WAIVER STATUS BADGE */}
                        {item.isConsentSigned ? (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-[10px] font-bold">
                            <FileCheck className="mr-1 h-3 w-3 text-emerald-600 inline" /> Signed Waiver
                          </Badge>
                        ) : item.hasConsent ? (
                          <Badge variant="outline" className="border-cyan-500/40 text-cyan-600 bg-cyan-500/10 text-[10px] font-bold">
                            <FileText className="mr-1 h-3 w-3 text-cyan-600 inline" /> Draft Waiver
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
                            No Consent Waiver
                          </Badge>
                        )}

                        {/* VISIT STATUS BADGE */}
                        <Badge variant="outline" className={`text-[10px] font-bold uppercase font-mono ${config.style}`}>
                          <StatusIcon className="mr-1 h-3 w-3 inline" /> {config.label}
                        </Badge>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-cyan-500/40 text-cyan-600 bg-cyan-500/10 hover:bg-cyan-600 hover:text-white rounded-xl px-3 font-semibold shadow-2xs group-hover:bg-cyan-600 group-hover:text-white transition-all shrink-0"
                      >
                        Open Workspace <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

