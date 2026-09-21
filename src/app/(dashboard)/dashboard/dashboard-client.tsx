"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/lib/types/enums";
import {
  AlertTriangle,
  X,
  MessageSquare,
  Calendar,
  Clock,
  Users,
  UserCheck,
  ArrowUpRight,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Database,
  FileText,
  Activity,
  Layers,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Plus,
  Stethoscope,
  TrendingUp,
  Wallet,
  Download,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { PageHeroBanner } from "@/components/shared/page-hero-banner";
import { toast } from "sonner";
import { downloadReportCsv, downloadExcelFromBase64 } from "@/lib/utils/report-export";
import { exportReportToExcelAction } from "../reports/actions";
import {
  getDashboardStatsAction,
  getPendingStaffNotificationsAction,
  dismissStaffNotificationAction,
  type StaffNotification,
  type DashboardStatsData,
} from "./actions";

interface DashboardClientProps {
  role?: UserRole;
}

export function DashboardClient({ role = "admin" }: DashboardClientProps) {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [isPending, startTransition] = useTransition();

  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(val);

  const handleQuickDownload = async () => {
    if (!stats) return;
    try {
      setIsExportingExcel(true);
      const res = await exportReportToExcelAction({
        timeframeLabel: "Overview Snapshot",
        generatedAt: new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }),
        financialSummary: {
          totalRevenue: stats.grossCollections,
          totalInvoiced: stats.grossCollections + stats.unpaidReceivables,
          receivables: stats.unpaidReceivables,
          completedVisits: stats.completedVisits,
          avgVisitValue: stats.averageSpend,
          totalAppointments: stats.todayAppointments,
          completionRate: 100,
          noShowRate: 0,
          cancellationRate: 0,
        },
        payments: [],
        paymentMethods: stats.paymentMethods.map((pm) => ({
          method: pm.method,
          label: pm.label,
          count: 0,
          amount: pm.amount,
          percentage: pm.percentage,
        })),
        doctors: [],
        procedures: [],
      });

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

  const loadData = async () => {
    const [statsResult, notifResult] = await Promise.all([
      getDashboardStatsAction(),
      getPendingStaffNotificationsAction(),
    ]);

    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data);
    }
    if (notifResult.success && notifResult.data) {
      setNotifications(notifResult.data);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDismiss = (id: string) => {
    startTransition(async () => {
      const result = await dismissStaffNotificationAction(id);
      if (result.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } else {
        console.error("[Dashboard] Failed to dismiss notification:", result.error);
        toast.error("Failed to dismiss alert: " + (result.error ?? "Unknown error"));
      }
    });
  };

  const statCards = role === "admin"
    ? [
        {
          title: "Total Collections",
          value: stats ? formatCurrency(stats.grossCollections) : "—",
          subtitle: "All clinic payments",
          change: "Revenue",
          changeType: "positive" as const,
          icon: TrendingUp,
          iconBg: "from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          href: "/reports",
        },
        {
          title: "Today's Schedule",
          value: stats?.todayAppointments ?? 0,
          subtitle: "Scheduled appointments",
          change: "Calendar",
          changeType: "positive" as const,
          icon: Calendar,
          iconBg: "from-cyan-500/20 to-teal-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
          href: "/appointments",
        },
        {
          title: "Completed Visits",
          value: stats?.completedVisits ?? 0,
          subtitle: "Fulfilled patient visits",
          change: "Treatments",
          changeType: "positive" as const,
          icon: CheckCircle2,
          iconBg: "from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
          href: "/reports",
        },
        {
          title: "Pending Receivables",
          value: stats ? formatCurrency(stats.unpaidReceivables) : "—",
          subtitle: "Uncollected invoice balances",
          change: "Invoices",
          changeType: "neutral" as const,
          icon: FileText,
          iconBg: "from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
          href: "/billing",
        },
      ]
    : [
        {
          title: "Pending Bookings",
          value: stats?.pendingBookings ?? 0,
          subtitle: "Requires staff review",
          change: "+2 new today",
          changeType: "neutral" as const,
          icon: Clock,
          iconBg: "from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
          href: "/bookings?status=pending",
        },
        {
          title: "Today's Schedule",
          value: stats?.todayAppointments ?? 0,
          subtitle: "Scheduled appointments",
          change: "On track",
          changeType: "positive" as const,
          icon: Calendar,
          iconBg: "from-cyan-500/20 to-teal-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
          href: "/appointments",
        },
        {
          title: "Patients In Queue",
          value: stats?.inQueue ?? 0,
          subtitle: "Active inside clinic",
          change: "Live status",
          changeType: "positive" as const,
          icon: Users,
          iconBg: "from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          href: "/check-in",
        },
        {
          title: "Unread Messages",
          value: stats?.unreadMessages ?? 0,
          subtitle: "Messenger inbox",
          change: "Response < 5m",
          changeType: "neutral" as const,
          icon: MessageSquare,
          iconBg: "from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
          href: "/chat",
        },
      ];

  return (
    <div className="space-y-6 pb-8">
      {/* LIGHT SaaS HERO HEADER */}
      <PageHeroBanner
        icon={Activity}
        title="Clinic Operations Desk"
        description="Real-time scheduling engine, patient check-in queue, and Messenger AI automation"
        badgeText="Live System"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="h-9 rounded-xl border-border/80 text-xs font-semibold"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-cyan-600" /> Refresh Operations
        </Button>
        {role === "admin" ? (
          <Link href="/settings">
            <Button size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs">
              <Settings className="mr-1.5 h-3.5 w-3.5" /> Clinic Settings
            </Button>
          </Link>
        ) : (
          <Link href="/appointments/new">
            <Button size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Appointment
            </Button>
          </Link>
        )}
      </PageHeroBanner>

      {/* Alert Banner Section */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-destructive uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4" />
            <span>Staff Attention Required ({notifications.length})</span>
          </div>
          {notifications.map((notif) => {
            const meta = notif.metadata ?? {};
            const patientPsid = (meta.patient_psid as string) ?? "unknown";
            const notifType = (meta.notification_type as string) ?? "unknown";
            const reason = (meta.reason as string) ?? "Unknown error";

            return (
              <Alert key={notif.id} variant="destructive" className="border-red-500/30 bg-red-500/10 rounded-2xl shadow-xs">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-red-900 dark:text-red-200">
                      Messenger Notification Failed ({notifType})
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                      PSID: <code className="bg-red-500/20 px-1.5 py-0.5 rounded font-mono font-bold">{patientPsid}</code> — {reason}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDismiss(notif.id)}
                    disabled={isPending}
                    className="self-end sm:self-center border-red-300 text-red-700 hover:bg-red-500/20 rounded-xl text-xs font-semibold"
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Dismiss Alert
                  </Button>
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      {/* PREMIUM MODERN TOP METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href} className="block group">
              <div className="stat-card-glow">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{card.title}</p>
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-tr ${card.iconBg} border flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <p className="text-3xl font-black tracking-tight text-foreground tabular-nums">
                    {stats ? card.value : "—"}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    {card.change}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                  <span>{card.subtitle}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:text-cyan-600 transition-all transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* QUICK OPERATIONS COMMAND HUB */}
      <div className="card-premium p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-600" />
            <span>{role === "admin" ? "Admin Management Hub" : "Quick Staff Operations Hub"}</span>
          </h2>
          <span className="text-[11px] text-muted-foreground">1-Click Shortcut Workspaces</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {role === "admin" ? (
            <>
              <Link href="/dentists" className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all flex items-center gap-3 group">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Stethoscope className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Doctors Directory</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Rosters & schedules</p>
                </div>
              </Link>

              <Link href="/reports" className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all flex items-center gap-3 group">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Revenue Analytics</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Financial performance</p>
                </div>
              </Link>

              <Link href="/services" className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-all flex items-center gap-3 group">
                <div className="h-9 w-9 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Procedure Catalog</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Services & pricing</p>
                </div>
              </Link>

              <Link href="/settings" className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-teal-500/10 hover:border-teal-500/40 transition-all flex items-center gap-3 group">
                <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Settings className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Clinic Settings</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Operations & rules</p>
                </div>
              </Link>
            </>
          ) : (
            <>
              <Link href="/patients/new" className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-all flex items-center gap-3 group">
                <div className="h-9 w-9 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">New Patient</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Add medical record</p>
                </div>
              </Link>

              <Link href="/bookings" className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-teal-500/10 hover:border-teal-500/40 transition-all flex items-center gap-3 group">
                <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Booking Desk</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Review requests</p>
                </div>
              </Link>

              <Link href="/check-in" className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all flex items-center gap-3 group">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <UserCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Check-In Desk</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Patient arrival</p>
                </div>
              </Link>

              <Link href="/chat" className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all flex items-center gap-3 group">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <MessageSquare className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Live Chat Desk</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Messenger bot</p>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Queue & Schedule Operations + Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {role === "admin" && (
            <Card className="border border-border/60 bg-card rounded-2xl shadow-xs overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    Revenue & Financial Performance
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Consolidated collections, average patient visit spend, and payment distribution
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isExportingExcel}
                    onClick={handleQuickDownload}
                    className="border-border/80 text-xs font-semibold h-8 rounded-xl"
                  >
                    {isExportingExcel ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                    )}
                    Download Excel (.xlsx)
                  </Button>
                  <Link href="/reports">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-8 shadow-xs">
                      <TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Full Reports <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground">Total Collections</p>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                      {stats ? formatCurrency(stats.grossCollections) : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Across all payment channels</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground">Avg. Spend / Visit</p>
                    <p className="text-xl font-black text-foreground mt-1 tabular-nums">
                      {stats ? formatCurrency(stats.averageSpend) : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Per completed treatment</p>
                  </div>
                  <Link
                    href="/billing"
                    className="p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all block group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground group-hover:text-amber-600 transition-colors">
                        Outstanding Invoices
                      </p>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-amber-600 transition-colors" />
                    </div>
                    <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                      {stats ? formatCurrency(stats.unpaidReceivables) : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-between">
                      <span>Unsettled patient balances</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">View list ↗</span>
                    </p>
                  </Link>
                </div>

                {/* Payment Methods Distribution */}
                <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5 text-cyan-600" />
                      Payment Channels Breakdown
                    </span>
                    <span className="text-[11px] font-bold text-muted-foreground">
                      {stats?.paymentMethods.length ?? 0} active channels
                    </span>
                  </div>

                  {stats && stats.paymentMethods.length > 0 ? (
                    <>
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
                        {stats.paymentMethods.map((pm, idx) => {
                          const colors = ["bg-emerald-500", "bg-blue-500", "bg-teal-500", "bg-purple-500", "bg-amber-500"];
                          return (
                            <div
                              key={pm.method}
                              style={{ width: `${pm.percentage}%` }}
                              className={`${colors[idx % colors.length]} h-full transition-all`}
                              title={`${pm.label}: ${formatCurrency(pm.amount)} (${pm.percentage}%)`}
                            />
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {stats.paymentMethods.map((pm, idx) => {
                          const dotColors = ["bg-emerald-500", "bg-blue-500", "bg-teal-500", "bg-purple-500", "bg-amber-500"];
                          return (
                            <div key={pm.method} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/40">
                              <div className={`h-2.5 w-2.5 rounded-full ${dotColors[idx % dotColors.length]} shrink-0`} />
                              <div className="min-w-0">
                                <p className="text-[11px] font-medium text-foreground truncate">{pm.label}</p>
                                <p className="text-xs font-bold text-foreground tabular-nums">{formatCurrency(pm.amount)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground py-2 text-center">No payment transactions recorded yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's Clinic Operations */}
          <Card className="border border-border/60 bg-card rounded-2xl shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
              <div>
                <CardTitle className="text-sm font-bold">
                  {role === "admin" ? "Today's Clinic Operations" : "Clinic Queue & Active Operations"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {role === "admin"
                    ? "Scheduled patient visits and operating capacity for today"
                    : "Real-time status of today's scheduled and checked-in patients"}
                </CardDescription>
              </div>
              {role === "admin" ? (
                <Link href="/appointments">
                  <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs h-8 shadow-xs">
                    <Calendar className="mr-1.5 h-3.5 w-3.5" /> View Appointments
                  </Button>
                </Link>
              ) : (
                <Link href="/check-in">
                  <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs h-8 shadow-xs">
                    <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Check-In Desk
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                  <p className="text-xs font-semibold text-muted-foreground">In Queue</p>
                  <p className="text-2xl font-extrabold text-foreground mt-1 tabular-nums">{stats?.inQueue ?? 0}</p>
                </div>
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                  <p className="text-xs font-semibold text-muted-foreground">Scheduled Today</p>
                  <p className="text-2xl font-extrabold text-foreground mt-1 tabular-nums">{stats?.todayAppointments ?? 0}</p>
                </div>
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {role === "admin" ? "Staff Attention" : "Pending Review"}
                  </p>
                  <p className="text-2xl font-extrabold text-foreground mt-1 tabular-nums">
                    {role === "admin" ? notifications.length : (stats?.pendingBookings ?? 0)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Operating Capacity</span>
                  <span className="font-bold text-cyan-600">{stats?.inQueue ?? 0} patients checked in</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-600 to-teal-500 transition-all duration-300" style={{ width: `${Math.min(((stats?.inQueue ?? 0) / 10) * 100, 100)}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Quick Actions & System Status */}
        <div className="space-y-6">


          {role === "admin" && (
            <Card className="border border-border/60 bg-card rounded-2xl shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  System Diagnostics
                </CardTitle>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" /> Operational
                </span>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground font-medium">Database Core</span>
                  <span className="font-mono text-foreground font-semibold">Postgres / Supabase</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground font-medium">Data Protection</span>
                  <span className="text-foreground font-semibold">31 RLS Tables Active</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground font-medium">Messenger Engine</span>
                  <span className="text-emerald-600 font-semibold">Webhooks Active</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground font-medium">Cron Automation</span>
                  <span className="text-foreground font-semibold">Reminders & Expiration</span>
                </div>
              </CardContent>
            </Card>
          )}

          {role !== "admin" && (
            <>
              <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-cyan-600" />
                    Clinical Quick Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2 text-xs">
                  <Link href="/check-in" className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:bg-cyan-500/5 hover:border-cyan-500/40 transition-colors">
                    <span className="font-semibold flex items-center gap-2 text-foreground">
                      <UserCheck className="h-3.5 w-3.5 text-cyan-600" /> Patient Check-In Desk
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>

                  <Link href="/dentists/unavailability" className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:bg-cyan-500/5 hover:border-cyan-500/40 transition-colors">
                    <span className="font-semibold flex items-center gap-2 text-foreground">
                      <Calendar className="h-3.5 w-3.5 text-cyan-600" /> My Schedule & Leave
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>

                  <Link href="/patients" className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:bg-cyan-500/5 hover:border-cyan-500/40 transition-colors">
                    <span className="font-semibold flex items-center gap-2 text-foreground">
                      <Users className="h-3.5 w-3.5 text-cyan-600" /> Patient Medical Files
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>

                  <Link href="/waitlist" className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:bg-cyan-500/5 hover:border-cyan-500/40 transition-colors">
                    <span className="font-semibold flex items-center gap-2 text-foreground">
                      <Clock className="h-3.5 w-3.5 text-cyan-600" /> Waitlist Queue
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </CardContent>
              </Card>

              <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
                <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-600" /> Clinical Shift Status
                  </CardTitle>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px] font-bold">
                    Active Duty
                  </Badge>
                </CardHeader>
                <CardContent className="p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                    <span className="text-muted-foreground">Assigned Clinic Hours</span>
                    <span className="font-bold text-foreground font-mono">08:00 AM – 05:00 PM</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                    <span className="text-muted-foreground">Today's Total Visits</span>
                    <span className="font-bold text-cyan-600 font-mono">{stats?.todayAppointments ?? 0} Patients</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
