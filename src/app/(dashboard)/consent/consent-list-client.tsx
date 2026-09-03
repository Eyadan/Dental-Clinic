"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  FileCheck,
  FileSignature,
  Search,
  CheckCircle2,
  Clock,
  User,
  Stethoscope,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import type { ConsentListItem } from "./page";

interface ConsentListClientProps {
  items: ConsentListItem[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const MOCK_CONSENTS: ConsentListItem[] = [
  {
    consentId: "demo-consent-1",
    appointmentId: "demo-appt-1",
    patientName: "Ana Patricia Lim",
    patientContact: "09171234567",
    referenceNo: "REF-8842",
    dentistName: "Dr. John Doe",
    treatmentInfo: "Tooth Extraction & Local Anesthesia Waiver",
    consentVersion: "1.0",
    signedAt: "2026-09-03T10:35:00Z",
    createdAt: "2026-09-03T10:30:00Z",
  },
  {
    consentId: "demo-consent-2",
    appointmentId: "demo-appt-2",
    patientName: "Maria Clara Santos",
    patientContact: "09189876543",
    referenceNo: "REF-7731",
    dentistName: "Dr. Jane Smith",
    treatmentInfo: "Orthodontic Bracket Installation & Care Protocol",
    consentVersion: "1.0",
    signedAt: null,
    createdAt: "2026-09-03T11:00:00Z",
  },
];

export function ConsentListClient({ items }: ConsentListClientProps) {
  const effectiveItems = items.length > 0 ? items : MOCK_CONSENTS;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "signed" | "pending">("all");

  const totalCount = effectiveItems.length;
  const signedCount = effectiveItems.filter((item) => item.signedAt !== null).length;
  const pendingCount = effectiveItems.filter((item) => item.signedAt === null).length;

  const filteredItems = effectiveItems.filter((item) => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.referenceNo && item.referenceNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.treatmentInfo.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === "signed") return item.signedAt !== null;
    if (activeFilter === "pending") return item.signedAt === null;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* BRANDED HERO HEADER WITH KPI METRICS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Patient Consent Desk</h1>
              <Badge variant="outline" className="border-cyan-500/30 text-cyan-600 font-mono text-[10px] uppercase font-bold">
                Digital Legal Waivers
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">View, manage, and verify patient informed consent documentation</p>
          </div>
        </div>

        {/* TOP STAT METRIC BADGES */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-muted/40 p-1.5 px-3 rounded-xl border border-border/60 text-xs">
            <span className="text-muted-foreground font-medium">Total:</span>
            <span className="font-bold text-foreground font-mono">{totalCount}</span>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 p-1.5 px-3 rounded-xl border border-emerald-500/20 text-xs font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Signed: {signedCount}</span>
          </div>
          <div className="flex items-center gap-2 bg-amber-500/10 text-amber-700 dark:text-amber-300 p-1.5 px-3 rounded-xl border border-amber-500/20 text-xs font-semibold">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Pending: {pendingCount}</span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR CONTROL RIBBON */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* SEGMENTED CONTROL TABS */}
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
              activeFilter === "all"
                ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 font-bold shadow-xs border border-slate-200/80 dark:border-slate-800"
                : "text-muted-foreground hover:text-foreground hover:bg-white/40"
            }`}
          >
            <span>All Waivers</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-700">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("signed")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
              activeFilter === "signed"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs border border-slate-200/80 dark:border-slate-800"
                : "text-muted-foreground hover:text-foreground hover:bg-white/40"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Signed</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
              {signedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("pending")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
              activeFilter === "pending"
                ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 font-bold shadow-xs border border-slate-200/80 dark:border-slate-800"
                : "text-muted-foreground hover:text-foreground hover:bg-white/40"
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Pending Signature</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 font-bold">
              {pendingCount}
            </span>
          </button>
        </div>

        {/* SEARCH INPUT */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, reference #..."
            className="pl-9 h-9 rounded-xl border-border/80 text-xs bg-card focus-visible:ring-cyan-500"
          />
        </div>
      </div>

      {/* RICH CONSENT CARDS GRID */}
      {filteredItems.length === 0 ? (
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs py-16 text-center">
          <CardContent className="max-w-md mx-auto space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FileSignature className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Consent Forms Found</h3>
            <p className="text-xs text-muted-foreground">
              No digital consent records match your current filter or search criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const isSigned = item.signedAt !== null;

            return (
              <Card
                key={item.consentId}
                className="border border-border/80 bg-card rounded-2xl shadow-xs hover:border-cyan-500/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden"
              >
                {/* CARD HEADER */}
                <CardHeader className="pb-3 pt-4 px-4 bg-muted/20 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs">
                      {getInitials(item.patientName)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground leading-tight">{item.patientName}</h3>
                      {item.referenceNo && (
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Ref: {item.referenceNo}</p>
                      )}
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold uppercase border ${
                      isSigned
                        ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                        : "border-amber-500/30 text-amber-600 bg-amber-500/10"
                    }`}
                  >
                    {isSigned ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Signed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-600" /> Pending
                      </span>
                    )}
                  </Badge>
                </CardHeader>

                {/* CARD BODY */}
                <CardContent className="p-4 space-y-3.5">
                  <div className="space-y-2 text-xs">
                    {/* TREATMENT INFO PILL */}
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-cyan-800 dark:text-cyan-300 font-medium">
                      <Stethoscope className="h-3.5 w-3.5 shrink-0 text-cyan-600 mt-0.5" />
                      <span className="leading-snug">{item.treatmentInfo}</span>
                    </div>

                    {/* DENTIST & CONTACT METRICS */}
                    {item.dentistName && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30 text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-cyan-600" /> Attending Dentist
                        </span>
                        <span className="font-semibold text-foreground">{item.dentistName}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30 text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-cyan-600" /> Form Created
                      </span>
                      <span className="font-semibold text-foreground font-mono">{formatDate(item.createdAt)}</span>
                    </div>

                    {isSigned && item.signedAt && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium">
                        <span className="flex items-center gap-1.5">
                          <FileCheck className="h-3.5 w-3.5 text-emerald-600" /> Signed At
                        </span>
                        <span className="font-semibold font-mono">{formatDate(item.signedAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* CARD ACTION BUTTON */}
                  <div className="pt-2 border-t border-border/40">
                    <Link href={`/consent/${item.consentId}`}>
                      <Button
                        size="sm"
                        className={`w-full h-9 rounded-xl text-xs font-bold shadow-xs transition-all ${
                          isSigned
                            ? "bg-cyan-600 hover:bg-cyan-700 text-white"
                            : "bg-amber-600 hover:bg-amber-700 text-white"
                        }`}
                      >
                        {isSigned ? (
                          <>
                            <FileCheck className="mr-1.5 h-3.5 w-3.5" /> View Signed Waiver
                          </>
                        ) : (
                          <>
                            <FileSignature className="mr-1.5 h-3.5 w-3.5" /> Open Tablet Signature
                          </>
                        )}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
