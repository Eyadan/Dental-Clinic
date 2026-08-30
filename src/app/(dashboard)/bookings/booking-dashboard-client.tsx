"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { approveAppointmentAction, declineAppointmentAction } from "../appointments/actions";
import { confirmCancellationAction, denyCancellationAction, rescheduleAppointmentAction } from "./actions";
import { Check, X, Clock, Loader2, CalendarClock, Ban, User, Calendar, CheckCircle2, CalendarCheck, Sparkles, Inbox, RefreshCw, Phone, Stethoscope } from "lucide-react";

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
}

interface BookingDashboardClientProps {
  bookings: Booking[];
  activeFilter?: string;
}

const STATUS_FILTERS = [
  { key: "pending", label: "Pending Review" },
  { key: "approved", label: "Approved" },
  { key: "reschedule_required", label: "Reschedule Req." },
  { key: "pending_cancellation", label: "Pending Cancel" },
  { key: "all", label: "All Requests" },
];

export function BookingDashboardClient({ bookings: initialBookings, activeFilter: initialFilter = "pending" }: BookingDashboardClientProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredBookings = bookings.filter((b) => {
    if (activeFilter === "all") return true;
    return b.booking_status === activeFilter;
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
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Staff Booking Request Desk</h1>
              {pendingCount > 0 && (
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] rounded-full font-bold">
                  {pendingCount} Pending Review
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Review, approve, reschedule, or decline patient appointment requests</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="h-9 rounded-xl border-border/80 text-xs hover:bg-muted/50 transition-all"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Refresh
          </Button>
          <Link href="/appointments/new">
            <Button size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all">
              <CalendarCheck className="mr-1.5 h-3.5 w-3.5" /> Book Appointment
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-2xl border-red-500/20 bg-red-500/5">
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {/* COMPACT SEGMENTED CONTROL TABS */}
      <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs max-w-full overflow-x-auto">
        {STATUS_FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          const count = bookings.filter((b) => f.key === "all" ? true : b.booking_status === f.key).length;

          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all whitespace-nowrap ${
                isActive
                  ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 font-bold shadow-xs border border-slate-200/80 dark:border-slate-800"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-slate-900/40"
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isActive ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold" : "bg-slate-200/60 dark:bg-slate-700 text-muted-foreground"}`}>
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
                onClick={() => setActiveFilter("all")}
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
          {filteredBookings.map((b) => (
            <Card key={b.id} className="border border-border/80 bg-card rounded-2xl shadow-xs hover:border-cyan-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-4 bg-muted/20 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs">
                    {getInitials(b.patient_name)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground leading-tight">{b.patient_name}</h3>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Ref: {b.reference_no}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] font-bold uppercase border ${
                  b.booking_status === "pending" ? "border-amber-500/30 text-amber-600 bg-amber-500/10" :
                  b.booking_status === "approved" ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" :
                  b.booking_status === "reschedule_required" ? "border-orange-500/30 text-orange-600 bg-orange-500/10" :
                  b.booking_status === "pending_cancellation" ? "border-red-500/30 text-red-600 bg-red-500/10" : ""
                }`}>
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

                {b.booking_status === "pending" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
