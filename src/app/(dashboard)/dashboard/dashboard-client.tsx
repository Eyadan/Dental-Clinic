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
      subtitle: "Requires approval",
      icon: Clock,
      href: "/appointments?status=pending",
    },
    {
      title: "Today's Schedule",
      value: stats?.todayAppointments ?? 0,
      subtitle: "Appointments today",
      icon: Calendar,
      href: "/appointments",
    },
    {
      title: "Patients In Queue",
      value: stats?.inQueue ?? 0,
      subtitle: "Active in clinic",
      icon: Users,
      href: "/check-in",
    },
    {
      title: "Unread Messages",
      value: stats?.unreadMessages ?? 0,
      subtitle: "Messenger inbox",
      icon: MessageSquare,
      href: "/chat",
    },
  ];

  return (
    <div className="space-y-6">
      {/* BRANDED HERO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/60 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Clinic Overview & Live Operations</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time appointment schedule, patient queue, and system status</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="h-9 rounded-xl border-border/60 text-xs hover:bg-muted/50 transition-all"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Refresh Stats
          </Button>
          <Link href="/appointments/new">
            <Button size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Appointment
            </Button>
          </Link>
        </div>
      </div>

      {/* Alert Banner Section */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-destructive uppercase tracking-wider">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Staff Attention Required ({notifications.length})</span>
          </div>
          {notifications.map((notif) => {
            const meta = notif.metadata ?? {};
            const patientPsid = (meta.patient_psid as string) ?? "unknown";
            const notifType = (meta.notification_type as string) ?? "unknown";
            const reason = (meta.reason as string) ?? "Unknown error";

            return (
              <Alert key={notif.id} variant="destructive" className="border-red-500/20 bg-red-500/5 rounded-2xl">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                      Messenger Notification Failed ({notifType})
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                      PSID: <code className="bg-red-500/10 px-1 py-0.5 rounded font-mono">{patientPsid}</code> — {reason}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDismiss(notif.id)}
                    disabled={isPending}
                    className="self-end sm:self-center border-red-300 text-red-700 hover:bg-red-500/10 rounded-xl text-xs"
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Dismiss
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
              <Card className="border border-border/60 bg-card rounded-2xl p-4 shadow-xs hover:border-cyan-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">{card.title}</p>
                  <div className="h-8 w-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 group-hover:scale-110 transition-transform">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <p className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
                    {stats ? card.value : "—"}
                  </p>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-cyan-600 transition-all" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium">{card.subtitle}</p>
              </Card>
            </Link>
          );
        })}
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
