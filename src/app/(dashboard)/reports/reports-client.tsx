"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Receipt,
  CreditCard,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowUpRight,
  Sparkles,
  Stethoscope,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Download,
  Printer,
  FileSpreadsheet,
  Loader2,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  downloadReportCsv,
  downloadExcelFromBase64,
  type ReportExportPayload,
} from "@/lib/utils/report-export";
import { exportReportToExcelAction } from "./actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PageHeroBanner } from "@/components/shared/page-hero-banner";
import type { PaymentMethod, PaymentStatus, BookingStatus, VisitStatus } from "@/lib/types/enums";

export interface AnalyticsPayment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
}

export interface AnalyticsInvoice {
  id: string;
  appointmentId: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export interface AnalyticsAppointment {
  id: string;
  referenceNo?: string;
  dentistId: string;
  bookingStatus: BookingStatus;
  visitStatus: VisitStatus | null;
  paymentStatus: PaymentStatus;
  scheduledDate: string;
  totalDuration: number;
  patientName?: string;
  patientContact?: string;
}

export interface PatientTransactionItem {
  id: string;
  paidAt: string;
  patientName: string;
  patientContact: string;
  referenceNo: string;
  doctorName: string;
  procedures: string;
  method: PaymentMethod;
  amount: number;
  totalInvoiceAmount: number;
  remainingBalance: number;
}

export interface AnalyticsDoctor {
  id: string;
  fullName: string;
  specialization: string;
  licenseNo: string;
  isActive: boolean;
}

export interface AnalyticsProcedureItem {
  id: string;
  appointmentId: string;
  serviceName: string;
  price: number;
}

interface ReportsClientProps {
  payments: AnalyticsPayment[];
  invoices: AnalyticsInvoice[];
  appointments: AnalyticsAppointment[];
  doctors: AnalyticsDoctor[];
  procedureItems: AnalyticsProcedureItem[];
}

type DateRange = "today" | "week" | "month" | "month_30" | "all";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  gcash: "GCash",
  maya: "Maya",
  card: "Credit / Debit Card",
  bank_transfer: "Bank Transfer",
};

const METHOD_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  cash: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  gcash: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", bar: "bg-blue-500" },
  maya: { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", bar: "bg-teal-500" },
  card: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", bar: "bg-purple-500" },
  bank_transfer: { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", bar: "bg-slate-500" },
};

function formatPeso(val: number): string {
  return "PHP " + (val || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ReportsClient({
  payments,
  invoices,
  appointments,
  doctors,
  procedureItems,
}: ReportsClientProps) {
  const [range, setRange] = useState<DateRange>("month");
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isReceivablesModalOpen, setIsReceivablesModalOpen] = useState(false);
  const [txSearchQuery, setTxSearchQuery] = useState("");
  const [txStatusFilter, setTxStatusFilter] = useState<"all" | "unpaid">("all");
  const [txCurrentPage, setTxCurrentPage] = useState(1);
  const TX_PAGE_SIZE = 10;

  // Determine boundary date based on selected filter
  const cutoffIso = useMemo(() => {
    const now = new Date();
    if (range === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return today.toISOString();
    }
    if (range === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return weekAgo.toISOString();
    }
    if (range === "month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return monthStart.toISOString();
    }
    if (range === "month_30") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return monthAgo.toISOString();
    }
    return null;
  }, [range]);

  // Filtered dataset
  const filteredPayments = useMemo(() => {
    if (!cutoffIso) return payments;
    return payments.filter((p) => p.paidAt >= cutoffIso);
  }, [payments, cutoffIso]);

  const filteredAppointments = useMemo(() => {
    if (!cutoffIso) return appointments;
    const cutoffDateStr = cutoffIso.split("T")[0];
    return appointments.filter((a) => a.scheduledDate >= cutoffDateStr);
  }, [appointments, cutoffIso]);

  const filteredAppointmentIds = useMemo(() => {
    return new Set(filteredAppointments.map((a) => a.id));
  }, [filteredAppointments]);

  const filteredInvoices = useMemo(() => {
    if (!cutoffIso) return invoices;
    return invoices.filter((i) => i.createdAt >= cutoffIso || filteredAppointmentIds.has(i.appointmentId));
  }, [invoices, cutoffIso, filteredAppointmentIds]);

  const filteredProcedureItems = useMemo(() => {
    return procedureItems.filter((item) => filteredAppointmentIds.has(item.appointmentId));
  }, [procedureItems, filteredAppointmentIds]);

  // Financial calculations
  const totalRevenue = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + p.amount, 0);
  }, [filteredPayments]);

  const totalInvoiced = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  }, [filteredInvoices]);

  const receivables = useMemo(() => {
    return Math.max(0, totalInvoiced - totalRevenue);
  }, [totalInvoiced, totalRevenue]);

  // Appointment efficiency calculations
  const totalAppointments = filteredAppointments.length;
  const completedVisits = filteredAppointments.filter((a) => a.visitStatus === "completed" || a.bookingStatus === "completed").length;
  const cancelledVisits = filteredAppointments.filter((a) => a.bookingStatus === "cancelled").length;
  const noShowVisits = filteredAppointments.filter((a) => a.bookingStatus === "no_show").length;
  const rescheduledVisits = filteredAppointments.filter((a) => a.bookingStatus === "rescheduled").length;

  const completionRate = totalAppointments > 0 ? Math.round((completedVisits / totalAppointments) * 100) : 0;
  const noShowRate = totalAppointments > 0 ? Math.round((noShowVisits / totalAppointments) * 100) : 0;
  const cancellationRate = totalAppointments > 0 ? Math.round((cancelledVisits / totalAppointments) * 100) : 0;

  const avgVisitValue = completedVisits > 0 ? totalRevenue / completedVisits : 0;

  // Payment methods breakdown
  const paymentMethodsData = useMemo(() => {
    const counts: Record<string, { amount: number; count: number }> = {};
    for (const p of filteredPayments) {
      const m = p.method ?? "cash";
      if (!counts[m]) counts[m] = { amount: 0, count: 0 };
      counts[m].amount += p.amount;
      counts[m].count += 1;
    }
    return Object.entries(counts)
      .map(([method, data]) => ({
        method,
        label: METHOD_LABELS[method] || method,
        amount: data.amount,
        count: data.count,
        percentage: totalRevenue > 0 ? Math.round((data.amount / totalRevenue) * 100) : 0,
        colors: METHOD_COLORS[method] || METHOD_COLORS.cash,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredPayments, totalRevenue]);

  // Top Procedures breakdown
  const topProcedures = useMemo(() => {
    const map: Record<string, { count: number; totalRevenue: number }> = {};
    for (const item of filteredProcedureItems) {
      if (!map[item.serviceName]) {
        map[item.serviceName] = { count: 0, totalRevenue: 0 };
      }
      map[item.serviceName].count += 1;
      map[item.serviceName].totalRevenue += item.price;
    }
    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        count: data.count,
        totalRevenue: data.totalRevenue,
        avgPrice: data.count > 0 ? data.totalRevenue / data.count : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [filteredProcedureItems]);

  // Doctor Productivity
  const doctorProductivity = useMemo(() => {
    return doctors.map((doc) => {
      const docAppointments = filteredAppointments.filter((a) => a.dentistId === doc.id);
      const docCompleted = docAppointments.filter((a) => a.visitStatus === "completed" || a.bookingStatus === "completed").length;
      
      const docApptIds = new Set(docAppointments.map((a) => a.id));
      const docRevenue = filteredProcedureItems
        .filter((item) => docApptIds.has(item.appointmentId))
        .reduce((sum, item) => sum + item.price, 0);

      return {
        id: doc.id,
        fullName: doc.fullName,
        specialization: doc.specialization,
        totalAppointments: docAppointments.length,
        completedVisits: docCompleted,
        billedRevenue: docRevenue,
      };
    }).sort((a, b) => b.billedRevenue - a.billedRevenue);
  }, [doctors, filteredAppointments, filteredProcedureItems]);

  // Patient transactions & billing audit
  const invoiceMap = useMemo(() => {
    return new Map(invoices.map((inv) => [inv.id, inv]));
  }, [invoices]);

  const appointmentMap = useMemo(() => {
    return new Map(appointments.map((appt) => [appt.id, appt]));
  }, [appointments]);

  const doctorMap = useMemo(() => {
    return new Map(doctors.map((d) => [d.id, d.fullName]));
  }, [doctors]);

  const appointmentProceduresMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of procedureItems) {
      const arr = map.get(item.appointmentId) || [];
      arr.push(item.serviceName);
      map.set(item.appointmentId, arr);
    }
    return map;
  }, [procedureItems]);

  const invoicePaidTotalMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payments) {
      map.set(p.invoiceId, (map.get(p.invoiceId) || 0) + p.amount);
    }
    return map;
  }, [payments]);

  const patientTransactions = useMemo<PatientTransactionItem[]>(() => {
    const list: PatientTransactionItem[] = filteredPayments.map((p) => {
      const inv = invoiceMap.get(p.invoiceId);
      const appt = inv ? appointmentMap.get(inv.appointmentId) : undefined;
      const docName = appt ? (doctorMap.get(appt.dentistId) || "Attending Dentist") : "Clinic Staff";
      const procList = appt ? appointmentProceduresMap.get(appt.id) : undefined;
      const proceduresStr = procList && procList.length > 0 ? procList.join(", ") : "General Consultation / Service";
      const totalInv = inv ? inv.totalAmount : p.amount;
      const totalPaid = inv ? (invoicePaidTotalMap.get(inv.id) || p.amount) : p.amount;
      const balance = Math.max(0, totalInv - totalPaid);

      return {
        id: p.id,
        paidAt: p.paidAt,
        patientName: appt?.patientName || "Walk-in Patient",
        patientContact: appt?.patientContact || "N/A",
        referenceNo: appt?.referenceNo || "N/A",
        doctorName: docName,
        procedures: proceduresStr,
        method: p.method,
        amount: p.amount,
        totalInvoiceAmount: totalInv,
        remainingBalance: balance,
      };
    });

    // Also include unsettled invoices with zero payments yet
    const paidInvoiceIds = new Set(filteredPayments.map((p) => p.invoiceId));
    for (const inv of filteredInvoices) {
      const totalPaid = invoicePaidTotalMap.get(inv.id) || 0;
      const balance = Math.max(0, inv.totalAmount - totalPaid);
      if (balance > 0 && !paidInvoiceIds.has(inv.id)) {
        const appt = appointmentMap.get(inv.appointmentId);
        const docName = appt ? (doctorMap.get(appt.dentistId) || "Attending Dentist") : "Clinic Staff";
        const procList = appt ? appointmentProceduresMap.get(appt.id) : undefined;
        const proceduresStr = procList && procList.length > 0 ? procList.join(", ") : "General Consultation / Service";

        list.push({
          id: `inv-${inv.id}`,
          paidAt: inv.createdAt,
          patientName: appt?.patientName || "Walk-in Patient",
          patientContact: appt?.patientContact || "N/A",
          referenceNo: appt?.referenceNo || "N/A",
          doctorName: docName,
          procedures: proceduresStr,
          method: "cash",
          amount: 0,
          totalInvoiceAmount: inv.totalAmount,
          remainingBalance: balance,
        });
      }
    }

    return list;
  }, [filteredPayments, filteredInvoices, invoiceMap, appointmentMap, doctorMap, appointmentProceduresMap, invoicePaidTotalMap]);

  const unpaidTransactions = useMemo(() => {
    return patientTransactions.filter((pt) => pt.remainingBalance > 0);
  }, [patientTransactions]);

  const unpaidCount = unpaidTransactions.length;

  const filteredPatientTransactions = useMemo(() => {
    let list = patientTransactions;
    if (txStatusFilter === "unpaid") {
      list = list.filter((pt) => pt.remainingBalance > 0);
    }
    const q = txSearchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((pt) =>
      pt.patientName.toLowerCase().includes(q) ||
      pt.referenceNo.toLowerCase().includes(q) ||
      pt.doctorName.toLowerCase().includes(q) ||
      pt.procedures.toLowerCase().includes(q) ||
      pt.patientContact.toLowerCase().includes(q) ||
      pt.method.toLowerCase().includes(q)
    );
  }, [patientTransactions, txSearchQuery, txStatusFilter]);

  const totalTxPages = Math.max(1, Math.ceil(filteredPatientTransactions.length / TX_PAGE_SIZE));
  const paginatedTransactions = useMemo(() => {
    const start = (txCurrentPage - 1) * TX_PAGE_SIZE;
    return filteredPatientTransactions.slice(start, start + TX_PAGE_SIZE);
  }, [filteredPatientTransactions, txCurrentPage]);

  const timeframeLabel = useMemo(() => {
    switch (range) {
      case "today": return "Today";
      case "week": return "Last 7 Days";
      case "month": return "This Month";
      case "month_30": return "Last 30 Days";
      case "all": return "All Time";
    }
  }, [range]);

  const buildExportPayload = (): ReportExportPayload => ({
    timeframeLabel,
    generatedAt: new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }),
    financialSummary: {
      totalRevenue,
      totalInvoiced,
      receivables,
      completedVisits,
      avgVisitValue,
      totalAppointments,
      completionRate,
      noShowRate,
      cancellationRate,
    },
    payments: filteredPayments.map((p) => ({
      id: p.id,
      paidAt: p.paidAt,
      amount: p.amount,
      method: p.method,
      invoiceId: p.invoiceId,
    })),
    paymentMethods: paymentMethodsData.map((pm) => ({
      method: pm.method,
      label: pm.label,
      count: pm.count,
      amount: pm.amount,
      percentage: pm.percentage,
    })),
    doctors: doctorProductivity.map((doc) => ({
      fullName: doc.fullName,
      licenseNo: doctors.find((d) => d.id === doc.id)?.licenseNo || "N/A",
      specialization: doc.specialization,
      totalAppointments: doc.totalAppointments,
      completedVisits: doc.completedVisits,
      billedRevenue: doc.billedRevenue,
    })),
    procedures: topProcedures.map((proc) => ({
      name: proc.name,
      count: proc.count,
      totalRevenue: proc.totalRevenue,
      avgPrice: proc.avgPrice,
    })),
    patientTransactions: patientTransactions.map((pt) => ({
      id: pt.id,
      paidAt: pt.paidAt,
      patientName: pt.patientName,
      patientContact: pt.patientContact,
      referenceNo: pt.referenceNo,
      doctorName: pt.doctorName,
      procedures: pt.procedures,
      method: pt.method,
      amount: pt.amount,
      totalInvoiceAmount: pt.totalInvoiceAmount,
      remainingBalance: pt.remainingBalance,
    })),
  });

  const handleDownloadExcel = async () => {
    try {
      setIsExportingExcel(true);
      const payload = buildExportPayload();
      const res = await exportReportToExcelAction(payload);
      if (res.success && res.data) {
        downloadExcelFromBase64(res.data.base64, res.data.filename);
        toast.success("Executive Excel workbook (.xlsx) downloaded successfully");
      } else {
        toast.error("Failed to generate Excel workbook: " + (res.error ?? "Unknown error"));
      }
    } catch (err) {
      toast.error("Error generating Excel: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleDownloadCsv = () => {
    const exportPayload = buildExportPayload();
    downloadReportCsv(exportPayload);
    toast.success("Full clinic report CSV downloaded successfully");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-8">
      {/* PRINT-ONLY OFFICIAL DOCUMENT HEADER */}
      <div className="hidden print:block mb-6 text-center border-b border-slate-300 pb-4">
        <h1 className="text-xl font-bold uppercase tracking-wider text-black">Dental Clinic Management System</h1>
        <p className="text-sm text-gray-700 font-semibold">Executive Analytics & Revenue Audit Report</p>
        <div className="flex justify-between text-xs text-gray-600 mt-3 pt-2 border-t border-gray-200">
          <span>Reporting Window: <strong className="text-black">{timeframeLabel}</strong></span>
          <span>Generated On: <strong className="text-black">{new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</strong></span>
        </div>
      </div>

      {/* HERO BANNER */}
      <div className="no-print">
        <PageHeroBanner
          icon={TrendingUp}
          title="Clinic Analytics & Revenue Reports"
          description="Gross revenue collections, payment method distribution, attendance conversion, and practitioner productivity"
          badgeText="Financial Intelligence"
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  disabled={isExportingExcel}
                  size="sm"
                  className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  {isExportingExcel ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Export Report
                  <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-80" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56 p-1.5 bg-card border border-border shadow-lg rounded-xl">
              <DropdownMenuItem
                onClick={handleDownloadExcel}
                className="flex items-center gap-2.5 py-2 px-2.5 cursor-pointer rounded-lg text-xs font-semibold hover:bg-muted"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="flex flex-col">
                  <span>Excel Workbook (.xlsx)</span>
                  <span className="text-[10px] font-normal text-muted-foreground">Formatted with 4 worksheets</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDownloadCsv}
                className="flex items-center gap-2.5 py-2 px-2.5 cursor-pointer rounded-lg text-xs font-semibold hover:bg-muted"
              >
                <Download className="h-4 w-4 text-cyan-600 shrink-0" />
                <div className="flex flex-col">
                  <span>CSV Spreadsheet (.csv)</span>
                  <span className="text-[10px] font-normal text-muted-foreground">Universal raw data</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handlePrint}
                className="flex items-center gap-2.5 py-2 px-2.5 cursor-pointer rounded-lg text-xs font-semibold hover:bg-muted"
              >
                <Printer className="h-4 w-4 text-slate-600 shrink-0" />
                <div className="flex flex-col">
                  <span>Print / Save as PDF</span>
                  <span className="text-[10px] font-normal text-muted-foreground">Printable document layout</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/billing">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-border/80 text-xs font-semibold"
            >
              <Receipt className="mr-1.5 h-3.5 w-3.5 text-cyan-600" />
              Billing Desk
            </Button>
          </Link>
        </PageHeroBanner>
      </div>

      {/* DATE RANGE FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70 shadow-2xs no-print">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
          <Calendar className="h-4 w-4 text-cyan-600" />
          <span>Reporting Window:</span>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/60 overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setRange("today")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              range === "today" ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setRange("week")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              range === "week" ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setRange("month")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              range === "month" ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => setRange("month_30")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              range === "month_30" ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Last 30 Days
          </button>
          <button
            type="button"
            onClick={() => setRange("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              range === "all" ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* 4 EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="stat-card-glow">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gross Collections</p>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-600 border border-emerald-500/30 flex items-center justify-center">
              <CreditCard className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-foreground tabular-nums">
            {formatPeso(totalRevenue)}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <span>Verified payments</span>
            <span className="text-emerald-600 font-bold">{filteredPayments.length} txns</span>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="stat-card-glow">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Completed Visits</p>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 text-cyan-600 border border-cyan-500/30 flex items-center justify-center">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <p className="text-3xl font-black tracking-tight text-foreground tabular-nums">
              {completedVisits}
            </p>
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-600 bg-cyan-500/10 text-xs font-bold">
              {completionRate}% rate
            </Badge>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground font-medium">
            Out of {totalAppointments} total scheduled
          </div>
        </div>

        {/* Average Visit Spend */}
        <div className="stat-card-glow">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Avg. Visit Spend</p>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-600 border border-indigo-500/30 flex items-center justify-center">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-foreground tabular-nums">
            {formatPeso(avgVisitValue)}
          </p>
          <div className="mt-2 text-[11px] text-muted-foreground font-medium">
            Revenue per completed patient
          </div>
        </div>

        {/* Outstanding Receivables */}
        <button
          type="button"
          onClick={() => setIsReceivablesModalOpen(true)}
          className="stat-card-glow block text-left w-full group hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-amber-600 transition-colors">
              Receivables
            </p>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-600 border border-amber-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-foreground tabular-nums">
            {formatPeso(receivables)}
          </p>
          <div className="mt-2 text-[11px] text-muted-foreground font-medium flex items-center justify-between">
            <span>Unpaid invoice balances</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold group-hover:underline flex items-center">
              View Breakdown ({unpaidCount}) <ArrowUpRight className="ml-0.5 h-3 w-3" />
            </span>
          </div>
        </button>
      </div>

      {/* OUTSTANDING RECEIVABLES BREAKDOWN MODAL */}
      <Dialog open={isReceivablesModalOpen} onOpenChange={setIsReceivablesModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-card border border-border shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border/50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Clock className="h-5 w-5 text-amber-500" />
                  Outstanding Receivables Breakdown
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Itemized accounts receivable and unsettled patient balances for {timeframeLabel}
                </DialogDescription>
              </div>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 px-3 py-1 font-mono text-xs font-bold shrink-0">
                Total Unpaid: {formatPeso(receivables)}
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {unpaidTransactions.length > 0 ? (
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/50">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Patient & Contact</th>
                      <th className="py-2.5 px-3 text-left">Ref / Date</th>
                      <th className="py-2.5 px-3 text-left">Doctor & Procedures</th>
                      <th className="py-2.5 px-3 text-right">Invoiced</th>
                      <th className="py-2.5 px-3 text-right">Paid</th>
                      <th className="py-2.5 px-3 text-right">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {unpaidTransactions.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-bold text-foreground">{item.patientName}</p>
                          <p className="text-[11px] text-muted-foreground">{item.patientContact}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-[11px] font-semibold text-foreground">
                            {item.referenceNo}
                          </span>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(item.paidAt).toLocaleDateString("en-PH", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-medium text-foreground">{item.doctorName}</p>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={item.procedures}>
                            {item.procedures}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                          {formatPeso(item.totalInvoiceAmount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {formatPeso(item.amount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          {formatPeso(item.remainingBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-foreground">No outstanding receivables</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">All patient invoices in this timeframe are fully settled.</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsReceivablesModalOpen(false);
                setTxStatusFilter("unpaid");
                const el = document.getElementById("patient-transactions-ledger");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-xs font-semibold cursor-pointer"
            >
              Filter Ledger Below ({unpaidCount})
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setIsReceivablesModalOpen(false)}
              className="bg-primary text-primary-foreground text-xs font-semibold rounded-xl cursor-pointer"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* TWO COLUMN PERFORMANCE BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Distribution */}
        <Card className="border border-border/70 bg-card rounded-2xl shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-cyan-600" />
              Collections by Payment Method
            </CardTitle>
            <CardDescription className="text-xs">
              Cash vs digital wallet payment channel split
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Visual multi-segment bar */}
            {paymentMethodsData.length > 0 ? (
              <>
                <div className="h-3.5 w-full rounded-full bg-muted/60 overflow-hidden flex">
                  {paymentMethodsData.map((item) => (
                    <div
                      key={item.method}
                      className={`${item.colors.bar} h-full transition-all duration-300`}
                      style={{ width: `${item.percentage}%` }}
                      title={`${item.label}: ${item.percentage}%`}
                    />
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  {paymentMethodsData.map((item) => (
                    <div
                      key={item.method}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-muted/20 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`h-2.5 w-2.5 rounded-full ${item.colors.bar}`} />
                        <span className="font-semibold text-foreground">{item.label}</span>
                        <span className="text-[10px] text-muted-foreground">({item.count} txns)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-foreground">
                          {formatPeso(item.amount)}
                        </span>
                        <Badge variant="outline" className={`border-border/60 ${item.colors.bg} ${item.colors.text} text-[10px] font-bold px-1.5`}>
                          {item.percentage}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No payment transactions found in this period.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appointment Attendance Funnel */}
        <Card className="border border-border/70 bg-card rounded-2xl shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Appointment Attendance & Funnel
            </CardTitle>
            <CardDescription className="text-xs">
              Patient visit adherence, cancellation, and no-show rates
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-3">
              {/* Completed */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Completed Visits
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {completedVisits} ({completionRate}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${completionRate}%` }} />
                </div>
              </div>

              {/* No Shows */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    No-Show Patients
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {noShowVisits} ({noShowRate}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${noShowRate}%` }} />
                </div>
              </div>

              {/* Cancelled */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                    Cancelled Appointments
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {cancelledVisits} ({cancellationRate}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${cancellationRate}%` }} />
                </div>
              </div>

              {/* Rescheduled */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5 text-blue-600" />
                    Rescheduled Appointments
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {rescheduledVisits}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION: PATIENT TRANSACTIONS & BILLING AUDIT LEDGER */}
      <Card id="patient-transactions-ledger" className="border border-border/70 bg-card rounded-2xl shadow-xs overflow-hidden scroll-mt-6">
        <CardHeader className="p-5 border-b border-border/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              Patient Transactions & Billing Audit Ledger
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Itemized audit ledger of individual patient payments, procedures rendered, attending dentists, and settlement balances
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Filter Toggle: All vs Unpaid Balances */}
            <div className="inline-flex items-center p-0.5 bg-muted/60 rounded-xl border border-border/50 text-xs">
              <button
                type="button"
                onClick={() => { setTxStatusFilter("all"); setTxCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${txStatusFilter === "all" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"}`}
              >
                All ({patientTransactions.length})
              </button>
              <button
                type="button"
                onClick={() => { setTxStatusFilter("unpaid"); setTxCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${txStatusFilter === "unpaid" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Clock className="h-3 w-3 text-amber-600" />
                Unpaid Balances ({unpaidCount})
              </button>
            </div>

            <div className="relative flex-1 md:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={txSearchQuery}
                onChange={(e) => {
                  setTxSearchQuery(e.target.value);
                  setTxCurrentPage(1);
                }}
                placeholder="Search patient, ref, doctor..."
                className="pl-9 h-8 text-xs rounded-xl"
              />
            </div>
            <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1 whitespace-nowrap">
              {filteredPatientTransactions.length} {filteredPatientTransactions.length === 1 ? "Record" : "Records"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {paginatedTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-3">Appointment Ref</th>
                    <th className="py-3 px-3">Attending Dentist</th>
                    <th className="py-3 px-3">Procedures Rendered</th>
                    <th className="py-3 px-3 text-center">Channel</th>
                    <th className="py-3 px-3 text-right">Amount Paid</th>
                    <th className="py-3 px-3 text-right">Invoice Total</th>
                    <th className="py-3 px-3 text-center">Settlement Status</th>
                    <th className="py-3 px-4 text-right">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {paginatedTransactions.map((pt) => {
                    const methodColor = METHOD_COLORS[pt.method] || METHOD_COLORS.cash;
                    const isFullySettled = pt.remainingBalance <= 0;

                    return (
                      <tr key={pt.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground">{pt.patientName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{pt.patientContact}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border/50">
                            {pt.referenceNo}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-foreground">
                          {pt.doctorName}
                        </td>
                        <td className="py-3 px-3 max-w-[220px]">
                          <span className="text-foreground line-clamp-2 leading-relaxed" title={pt.procedures}>
                            {pt.procedures}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {pt.amount > 0 ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${methodColor.bg} ${methodColor.text}`}
                            >
                              {METHOD_LABELS[pt.method] || pt.method}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Unpaid
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatPeso(pt.amount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                          {formatPeso(pt.totalInvoiceAmount)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isFullySettled ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold"
                            >
                              Fully Settled
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold"
                            >
                              Bal: {formatPeso(pt.remainingBalance)}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                          {new Date(pt.paidAt).toLocaleString("en-PH", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <Receipt className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="font-semibold">No patient transaction records found.</p>
              <p className="text-[11px] mt-0.5">Try selecting a different reporting window or clearing the search query.</p>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredPatientTransactions.length > TX_PAGE_SIZE && (
            <div className="p-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <div>
                Showing {(txCurrentPage - 1) * TX_PAGE_SIZE + 1} to{" "}
                {Math.min(txCurrentPage * TX_PAGE_SIZE, filteredPatientTransactions.length)} of{" "}
                {filteredPatientTransactions.length} records
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={txCurrentPage === 1}
                  onClick={() => setTxCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                </Button>
                <span className="font-mono px-2 text-xs font-semibold text-foreground">
                  Page {txCurrentPage} of {totalTxPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={txCurrentPage >= totalTxPages}
                  onClick={() => setTxCurrentPage((p) => Math.min(totalTxPages, p + 1))}
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* LOWER TABLES GRID: TOP PROCEDURES & DOCTOR PRODUCTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Procedures */}
        <Card className="border border-border/70 bg-card rounded-2xl shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-600" />
              Top Procedures by Revenue
            </CardTitle>
            <CardDescription className="text-xs">
              Highest grossing dental treatments in this window
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            {topProcedures.length > 0 ? (
              <div className="space-y-2.5">
                {topProcedures.map((p, idx) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.count} performed</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-foreground">{formatPeso(p.totalRevenue)}</p>
                      <p className="text-[10px] text-muted-foreground">avg {formatPeso(p.avgPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No procedure billing records in this period.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Doctor Productivity */}
        <Card className="border border-border/70 bg-card rounded-2xl shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-teal-600" />
                Doctor Productivity
              </CardTitle>
              <CardDescription className="text-xs">
                Caseload and billed treatment value per attending dentist
              </CardDescription>
            </div>
            <Link href="/dentists">
              <Button size="sm" variant="ghost" className="h-7 text-xs text-cyan-600 hover:text-cyan-700">
                Directory <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-5">
            {doctorProductivity.length > 0 ? (
              <div className="space-y-2.5">
                {doctorProductivity.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20 text-xs"
                  >
                    <div>
                      <p className="font-bold text-foreground">{doc.fullName}</p>
                      <p className="text-[10px] text-muted-foreground">{doc.specialization}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-foreground">{formatPeso(doc.billedRevenue)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {doc.completedVisits} completed / {doc.totalAppointments} visits
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No doctor appointment data recorded in this period.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
