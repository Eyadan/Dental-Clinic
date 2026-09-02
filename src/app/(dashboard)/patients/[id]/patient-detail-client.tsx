"use client";

import { useState } from "react";
import { parseAllergies } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
import { DentalChartPanel } from "@/components/dental-chart/dental-chart-panel";
import { DentalChartHistoryTimeline } from "@/components/dental-chart/dental-chart-history-timeline";
import { DentalChartSnapshotViewer } from "@/components/dental-chart/dental-chart-snapshot-viewer";
import { PatientBillingHistory } from "@/components/patients/patient-billing-history";
import { PatientVisitHistory } from "@/components/patients/patient-visit-history";
import { updatePatientAction } from "../actions";
import { Pencil, Phone, Mail, Calendar, AlertTriangle, User, HeartPulse, CheckCircle2, FileText, ArrowUpRight } from "lucide-react";
import type { Patient, PatientMedicalRecord, MedicalCondition, DentalChart, ToothPresence, ToothFinding } from "@/lib/types/database";

interface PatientDetailClientProps {
  patient: Patient;
  medicalRecord: PatientMedicalRecord | null;
  conditions: MedicalCondition[];
  conditionIds: string[];
  dentalChart: DentalChart;
  dentalChartPresence: ToothPresence[];
  dentalChartFindings: ToothFinding[];
}

type TabId = "profile" | "medical" | "dental_chart" | "visits" | "billing";

const TABS: { id: TabId; label: string }[] = [
  { id: "profile", label: "Demographics & Profile" },
  { id: "medical", label: "Medical History" },
  { id: "dental_chart", label: "Dental Chart" },
  { id: "visits", label: "Visit History" },
  { id: "billing", label: "Invoices & Billing" },
];

export function PatientDetailClient({ patient, medicalRecord, conditions, conditionIds, dentalChart, dentalChartPresence, dentalChartFindings }: PatientDetailClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [editOpen, setEditOpen] = useState(false);

  const fullName = `${patient.first_name} ${patient.last_name}`;

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

  const age = calculateAge(patient.birth_date);
  const hasAllergies = patient.allergies && patient.allergies.trim().toLowerCase() !== "none" && patient.allergies.trim().toLowerCase() !== "";

  return (
    <div className="space-y-6">
      {/* BRANDED HERO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20 font-bold text-sm">
            {getInitials(patient.first_name, patient.last_name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{fullName}</h1>
              <Badge variant="outline" className={`text-[10px] uppercase font-mono ${patient.is_archived ? "border-amber-500/30 text-amber-600 bg-amber-500/10" : "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"}`}>
                {patient.is_archived ? "Archived Record" : "Active Patient"}
              </Badge>
              {age !== null && (
                <Badge variant="outline" className="border-border text-muted-foreground font-mono text-[10px]">
                  {age} yrs old
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              Patient ID: #{patient.id.slice(0, 8).toUpperCase()} · Registered {new Date(patient.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        <Button onClick={() => setEditOpen(true)} size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs">
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Demographics
        </Button>
      </div>

      {/* COMPACT SEGMENTED TABS */}
      <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs max-w-full overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all whitespace-nowrap ${
                isActive
                  ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 font-bold shadow-xs border border-slate-200/80 dark:border-slate-800"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-slate-900/40"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "profile" && (
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
            <CardHeader className="border-b border-border/40 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-cyan-600" /> Contact & Demographics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                <span className="text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-cyan-600" /> Phone Number</span>
                <span className="font-semibold text-foreground font-mono">{patient.contact_no}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                <span className="text-muted-foreground flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-cyan-600" /> Email Address</span>
                <span className="font-semibold text-foreground">{patient.email || "Not provided"}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-cyan-600" /> Birth Date</span>
                <span className="font-semibold text-foreground">{patient.birth_date ? new Date(patient.birth_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Not provided"}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
            <CardHeader className="border-b border-border/40 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-amber-500" /> Allergies & Medical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {(() => {
                const allergyList = parseAllergies(patient.allergies);
                return allergyList.length > 0 ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <p className="font-bold text-xs">Known Patient Allergies ({allergyList.length})</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {allergyList.map((allergy, idx) => (
                        <Badge key={idx} variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/20 text-xs font-bold px-2.5 py-1">
                          <AlertTriangle className="mr-1.5 h-3.5 w-3.5 shrink-0 text-amber-600" /> {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-xs">No Known Drug/Material Allergies (NKDA)</span>
                  </div>
                );
              })()}

              <div className="space-y-1 pt-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase">Medical History & Conditions</p>
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-xs">
                  {patient.medical_history ? (
                    <p className="text-foreground leading-relaxed">{patient.medical_history}</p>
                  ) : (
                    <p className="text-muted-foreground italic">No medical conditions or surgical history recorded.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "medical" && (
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
            <CardHeader className="border-b border-border/40 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-cyan-600" /> Physician & Screening
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                <span className="text-muted-foreground">Physician</span>
                <span className="font-semibold text-foreground">{medicalRecord?.physician_name || "Not provided"}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                <span className="text-muted-foreground">Blood Type / Pressure</span>
                <span className="font-semibold text-foreground font-mono">{medicalRecord?.blood_type || "—"} / {medicalRecord?.blood_pressure || "—"}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                <span className="text-muted-foreground">In Good Health</span>
                <Badge variant="outline" className={medicalRecord?.is_in_good_health ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" : "border-border text-muted-foreground"}>
                  {medicalRecord?.is_in_good_health ? "Yes" : "No / Not specified"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
            <CardHeader className="border-b border-border/40 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Existing Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs">
              {conditionIds.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {conditions
                    .filter((c) => conditionIds.includes(c.id))
                    .map((c) => (
                      <Badge key={c.id} variant="outline" className="border-amber-500/30 text-amber-700 bg-amber-500/10 text-[11px] font-semibold">
                        {c.name}
                      </Badge>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No known conditions checked.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "dental_chart" && (
        <div className="space-y-4">
          <DentalChartPanel patientId={patient.id} chart={dentalChart} presence={dentalChartPresence} findings={dentalChartFindings} />
          <DentalChartSnapshotViewer patientId={patient.id} />
          <DentalChartHistoryTimeline patientId={patient.id} />
        </div>
      )}

      {activeTab === "visits" && (
        <PatientVisitHistory patientId={patient.id} />
      )}

      {activeTab === "billing" && (
        <PatientBillingHistory patientId={patient.id} />
      )}

      <PatientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        patient={patient}
        medicalRecord={medicalRecord}
        conditionIds={conditionIds}
        conditions={conditions}
        onSubmit={(formData) => updatePatientAction(patient.id, formData)}
      />
    </div>
  );
}
