"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { approveAppointmentAction, declineAppointmentAction } from "../appointments/actions";
import { confirmCancellationAction, denyCancellationAction, rescheduleAppointmentAction } from "./actions";
import { Check, X, Clock, Loader2, CalendarClock, Ban, User, Calendar, CheckCircle2, CalendarCheck, Sparkles, Inbox, RefreshCw, Phone, Stethoscope } from "lucide-react";
import { PageHeroBanner } from "@/components/shared/page-hero-banner";

interface Booking {
  id: string;
  reference_no: string;
  patient_name: string;
  patient_contact: string;
  booking_status: string;
  scheduled_date: string;
  scheduled_time: string;
  total_duration: number;
  created_at: string;
  service_name?: string;
  dentist_name?: string;
}

interface BookingDashboardClientProps {
  bookings: Booking[];
  activeFilter?: string;
  userRole?: string;
}

const STATUS_FILTERS = [
  { key: "pending", label: "Pending Review", badgeColor: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  { key: "approved", label: "Approved", badgeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  { key: "completed", label: "Completed", badgeColor: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30" },
  { key: "reschedule_required", label: "Reschedule Req.", badgeColor: "bg-orange-500/10 text-orange-700 border-orange-500/30" },
  { key: "rescheduled", label: "Rescheduled", badgeColor: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  { key: "pending_cancellation", label: "Pending Cancel", badgeColor: "bg-red-500/10 text-red-700 border-red-500/30" },
  { key: "all", label: "All Requests", badgeColor: "bg-slate-500/10 text-slate-700 border-slate-500/30" },
];

const STATUS_PRIORITY: Record<string, number> = {
  pending: 1,
  approved: 2,
  completed: 3,
  rescheduled: 4,
  reschedule_required: 5,
  pending_cancellation: 6,
  declined: 7,
  cancelled: 8,
};

export function BookingDashboardClient({ bookings: initialBookings, activeFilter: initialFilter = "pending", userRole = "reception" }: BookingDashboardClientProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setBookings(initialBookings);
  }, [initialBookings]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel("appointments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const filteredBookings = bookings
    .filter((b) => {
      if (activeFilter === "all") return true;
      return b.booking_status === activeFilter;
    })
    .sort((a, b) => {
      const priorityA = STATUS_PRIORITY[a.booking_status] ?? 99;
      const priorityB = STATUS_PRIORITY[b.booking_status] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const pendingCount = bookings.filter((b) => b.booking_status === "pending").length;

  const handleApprove = (id: string) => {
    setPendingId(id);
    startTransition(async () => {
      const res = await approveAppointmentAction(id);
      if (res.success) {
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, booking_status: "approved" } : b)));
        router.refresh();
      } else {
        setError(res.error ?? "Failed to approve");
      }
      setPendingId(null);
    });
  };

  const handleDecline = (id: string) => {
    setPendingId(id);
    startTransition(async () => {
      const res = await declineAppointmentAction(id);
      if (res.success) {
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, booking_status: "declined" } : b)));
        router.refresh();
      } else {
        setError(res.error ?? "Failed to decline");
      }
      setPendingId(null);
    });
  };

  const handleConfirmCancellation = (id: string) => {
    setPendingId(id);
    startTransition(async () => {
      const res = await confirmCancellationAction(id);
      if (res.success) {
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, booking_status: "cancelled" } : b)));
        router.refresh();
      } else {
        setError(res.error ?? "Failed to confirm cancellation");
      }
      setPendingId(null);
    });
  };

  const handleDenyCancellation = (id: string) => {
    setPendingId(id);
    startTransition(async () => {
      const res = await denyCancellationAction(id, "Cancellation request declined by clinic staff");
      if (res.success) {
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, booking_status: "approved" } : b)));
        router.refresh();
      } else {
        setError(res.error ?? "Failed to deny cancellation");
      }
      setPendingId(null);
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeroBanner
        icon={CalendarClock}
        title="Booking Desk & Online Requests"
        description="Review, approve, or reschedule online appointment requests from patients"
        badgeText={`${pendingCount} Pending`}
      >
        <Link href="/bookings/calendar">
          <Button size="sm" variant="outline" className="h-9 rounded-xl text-xs font-semibold border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10">
            <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
            Switch to Calendar View
          </Button>
        </Link>
      </PageHeroBanner>

      {error && (
        <Alert variant="destructive" className="rounded-2xl border-red-500/20 bg-red-500/5">
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {/* COMPACT SEGMENTED CONTROL TABS */}
      <div className="inline-flex items-center gap-1.5 p-1.5 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs max-w-full overflow-x-auto shadow-xs backdrop-blur-md">
        {STATUS_FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          const count = bookings.filter((b) => f.key === "all" ? true : b.booking_status === f.key).length;

          return (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setActiveFilter(f.key);
                router.push(`/bookings?status=${f.key}`, { scroll: false });
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                isActive
                  ? "bg-gradient-to-r from-cyan-500/15 to-teal-500/5 text-cyan-600 dark:text-cyan-400 font-extrabold shadow-xs border border-cyan-500/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${isActive ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* RICH BOOKINGS GRID OR ILLUSTRATED EMPTY STATE */}
      {filteredBookings.length === 0 ? (
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs py-16 px-6 text-center">
          <CardContent className="max-w-md mx-auto space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 shadow-xs">
              <Inbox className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">No Booking Requests Found</h3>
              <p className="text-xs text-muted-foreground">
                There are currently no patient booking requests in the <span className="font-semibold text-foreground">"{STATUS_FILTERS.find((f) => f.key === activeFilter)?.label}"</span> category.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveFilter("all");
                  router.push("/bookings?status=all", { scroll: false });
                }}
                className="h-9 rounded-xl border-border/80 text-xs hover:bg-muted/50"
              >
                View All Requests ({bookings.length})
              </Button>
              <Link href="/appointments/new">
                <Button size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs">
                  Create New Appointment
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBookings.map((b) => {
            const headerStyle =
              b.booking_status === "pending" ? {
                headerBg: "bg-amber-500/15 dark:bg-amber-950/40 border-b border-amber-500/30",
                avatarBg: "bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/30",
                badge: "border-amber-500/40 text-amber-700 dark:text-amber-300 bg-background/90",
              } : b.booking_status === "approved" ? {
                headerBg: "bg-emerald-500/15 dark:bg-emerald-950/40 border-b border-emerald-500/30",
                avatarBg: "bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30",
                badge: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-background/90",
              } : b.booking_status === "completed" ? {
                headerBg: "bg-cyan-500/15 dark:bg-cyan-950/40 border-b border-cyan-500/30",
                avatarBg: "bg-cyan-500/25 text-cyan-800 dark:text-cyan-200 border border-cyan-500/30",
                badge: "border-cyan-500/40 text-cyan-700 dark:text-cyan-300 bg-background/90",
              } : b.booking_status === "rescheduled" ? {
                headerBg: "bg-blue-500/15 dark:bg-blue-950/40 border-b border-blue-500/30",
                avatarBg: "bg-blue-500/25 text-blue-800 dark:text-blue-200 border border-blue-500/30",
                badge: "border-blue-500/40 text-blue-700 dark:text-blue-300 bg-background/90",
              } : b.booking_status === "reschedule_required" ? {
                headerBg: "bg-orange-500/15 dark:bg-orange-950/40 border-b border-orange-500/30",
                avatarBg: "bg-orange-500/25 text-orange-800 dark:text-orange-200 border border-orange-500/30",
                badge: "border-orange-500/40 text-orange-700 dark:text-orange-300 bg-background/90",
              } : {
                headerBg: "bg-red-500/15 dark:bg-red-950/40 border-b border-red-500/30",
                avatarBg: "bg-red-500/25 text-red-800 dark:text-red-200 border border-red-500/30",
                badge: "border-red-500/40 text-red-700 dark:text-red-300 bg-background/90",
              };

            return (
              <Card key={b.id} className="border border-border/80 bg-card rounded-2xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden pt-0">
                <CardHeader className={`pb-3 pt-4 px-4 flex flex-row items-center justify-between space-y-0 ${headerStyle.headerBg}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs ${headerStyle.avatarBg}`}>
                      {getInitials(b.patient_name)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground leading-tight">{b.patient_name}</h3>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Ref: {b.reference_no}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-bold uppercase border ${headerStyle.badge}`}>
                    {b.booking_status.replace(/_/g, " ")}
                  </Badge>
                </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                <div className="space-y-2 text-xs">
                  {b.service_name && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-medium">
                      <Stethoscope className="h-3.5 w-3.5 shrink-0 text-cyan-600" />
                      <span className="truncate">{b.service_name}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30 text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-cyan-600" /> Scheduled Date
                    </span>
                    <span className="font-semibold text-foreground font-mono">{b.scheduled_date}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30 text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-cyan-600" /> Time & Duration
                    </span>
                    <span className="font-semibold text-foreground font-mono">{b.scheduled_time} ({b.total_duration}m)</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30 text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-cyan-600" /> Patient Phone
                    </span>
                    <span className="font-semibold text-foreground font-mono">{b.patient_contact}</span>
                  </div>
                </div>

                {(b.booking_status === "pending" || b.booking_status === "rescheduled") && (
                  <div className="pt-2 border-t border-border/40">
                    {userRole === "reception" ? (
                      <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-semibold">
                        <Clock className="h-3.5 w-3.5" /> Awaiting Dentist Approval
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(b.id)}
                          disabled={pendingId === b.id || isPending}
                          className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs h-9 font-semibold shadow-xs"
                        >
                          {pendingId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />} Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDecline(b.id)}
                          disabled={pendingId === b.id || isPending}
                          className="flex-1 border-border/80 text-destructive hover:bg-destructive/10 rounded-xl text-xs h-9 font-semibold"
                        >
                          <X className="mr-1.5 h-3.5 w-3.5" /> Decline
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {b.booking_status === "pending_cancellation" && (
                  <div className="pt-2 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleConfirmCancellation(b.id)}
                        disabled={pendingId === b.id || isPending}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs h-9 font-semibold shadow-xs"
                      >
                        {pendingId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />} Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDenyCancellation(b.id)}
                        disabled={pendingId === b.id || isPending}
                        className="flex-1 border-border/80 text-foreground hover:bg-muted/50 rounded-xl text-xs h-9 font-semibold"
                      >
                        {pendingId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="mr-1.5 h-3.5 w-3.5" />} Deny
                      </Button>
                    </div>
                  </div>
                )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
