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
  Database,
  FileText,
  Activity,
  Layers,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Plus,
  Stethoscope,
} from "lucide-react";
import { PageHeroBanner } from "@/components/shared/page-hero-banner";
import {
  getDashboardStatsAction,
  getPendingStaffNotificationsAction,
  dismissStaffNotificationAction,
  type StaffNotification,
} from "./actions";

interface DashboardClientProps {
  role?: UserRole;
}

export function DashboardClient({ role = "admin" }: DashboardClientProps) {
  const [stats, setStats] = useState<{
    pendingBookings: number;
    todayAppointments: number;
    inQueue: number;
    unreadMessages: number;
  } | null>(null);
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [isPending, startTransition] = useTransition();

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
      await dismissStaffNotificationAction(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    });
  };

  const statCards = [
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
        <Link href="/appointments/new">
          <Button size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New Appointment
          </Button>
        </Link>
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
            <span>Quick Staff Operations Hub</span>
          </h2>
          <span className="text-[11px] text-muted-foreground">1-Click Shortcut Workspaces</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Queue & Schedule Operations */}
        <Card className="lg:col-span-2 border border-border/60 bg-card rounded-2xl shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
            <div>
              <CardTitle className="text-sm font-bold">Clinic Queue & Active Operations</CardTitle>
              <CardDescription className="text-xs">Real-time status of today's scheduled and checked-in patients</CardDescription>
            </div>
            <Link href="/check-in">
              <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs h-8 shadow-xs">
                <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Check-In Desk
              </Button>
            </Link>
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
                <p className="text-xs font-semibold text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-extrabold text-foreground mt-1 tabular-nums">{stats?.pendingBookings ?? 0}</p>
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

        {/* RIGHT COLUMN: Quick Actions & System Status */}
        <div className="space-y-6">
          {role === "admin" && (
            <Card className="border border-border/60 bg-card rounded-2xl shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold">Admin Management Modules</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                <Link href="/settings" className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors">
                  <span className="text-xs font-semibold flex items-center gap-2">
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" /> Clinic Settings
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
                <Link href="/audit" className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors">
                  <span className="text-xs font-semibold flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" /> Audit Trail
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
                <Link href="/services" className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors">
                  <span className="text-xs font-semibold flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" /> Procedure Catalog
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
                <Link href="/patients/archived" className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors">
                  <span className="text-xs font-semibold flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Archived Records
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>
          )}

          {role === "admin" && (
            <Card className="border border-border/60 bg-card rounded-2xl shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold">System Status</CardTitle>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Online
                </span>
              </CardHeader>
              <CardContent className="p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                  <span className="text-muted-foreground">Local Supabase DB</span>
                  <span className="font-mono text-foreground font-semibold">127.0.0.1:54321</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                  <span className="text-muted-foreground">Security Policies</span>
                  <span className="text-foreground font-semibold">13 RLS Active</span>
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
