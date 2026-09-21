"use client";

import { useState, useMemo } from "react";
import {
  Stethoscope,
  Search,
  Calendar,
  Clock,
  CalendarOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Users,
  Filter,
  X,
  History,
  Info,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PageHeroBanner } from "@/components/shared/page-hero-banner";

export interface DoctorScheduleSummary {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface DoctorBlockSummary {
  id: string;
  startDatetime: string;
  endDatetime: string;
  blockType: string;
  reason: string | null;
}

export interface DoctorDirectoryItem {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  licenseNo: string;
  specialization: string;
  isActive: boolean;
  schedules: DoctorScheduleSummary[];
  upcomingBlocks: DoctorBlockSummary[];
}

export interface DoctorLeaveRecord {
  id: string;
  dentistId: string;
  dentistName: string;
  specialization: string;
  licenseNo: string;
  startDatetime: string;
  endDatetime: string;
  blockType: string;
  reason: string | null;
  status: "active_now" | "upcoming" | "completed";
}

interface DentistsClientProps {
  doctors: DoctorDirectoryItem[];
  leaveRecords: DoctorLeaveRecord[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const BLOCK_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  vacation: { label: "Vacation", bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/30" },
  sick_leave: { label: "Sick Leave", bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30" },
  break: { label: "Break", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  other: { label: "Other", bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/30" },
};

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours, 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${minutes ?? "00"} ${ampm}`;
}

function formatDateTime(isoStr: string): string {
  if (!isoStr) return "N/A";
  const d = new Date(isoStr);
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(startIso: string, endIso: string): string {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const diffMs = Math.max(0, end - start);
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hr" : "hrs"}`;
  }
  const diffDays = Math.ceil(diffHours / 24);
  return `${diffDays} ${diffDays === 1 ? "day" : "days"}`;
}

export function DentistsClient({ doctors, leaveRecords }: DentistsClientProps) {
  const [viewMode, setViewMode] = useState<"directory" | "leave_history">("directory");
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "on_duty" | "active" | "on_leave">("all");
  const [selectedDoctorForShifts, setSelectedDoctorForShifts] = useState<DoctorDirectoryItem | null>(null);

  // Leave History tab states
  const [leaveSearch, setLeaveSearch] = useState("");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<"all" | "active_now" | "upcoming" | "completed">("all");
  const [leaveDoctorFilter, setLeaveDoctorFilter] = useState<string>("all");

  const todayDayOfWeek = new Date().getDay();
  const nowIso = new Date().toISOString();

  // Compute doctor statuses
  const doctorsWithStatus = useMemo(() => {
    return doctors.map((doc) => {
      const todaySchedule = doc.schedules.find((s) => s.dayOfWeek === todayDayOfWeek);
      const isBlockedNow = doc.upcomingBlocks.some(
        (b) => b.startDatetime <= nowIso && b.endDatetime >= nowIso,
      );
      const isOnDutyToday = Boolean(todaySchedule && !isBlockedNow && doc.isActive);

      return {
        ...doc,
        todaySchedule,
        isBlockedNow,
        isOnDutyToday,
      };
    });
  }, [doctors, todayDayOfWeek, nowIso]);

  // Filtered doctors for directory
  const filteredDoctors = useMemo(() => {
    const query = search.toLowerCase().trim();
    return doctorsWithStatus.filter((doc) => {
      if (filterTab === "on_duty" && !doc.isOnDutyToday) return false;
      if (filterTab === "active" && !doc.isActive) return false;
      if (filterTab === "on_leave" && !doc.isBlockedNow && doc.upcomingBlocks.length === 0) return false;

      if (!query) return true;
      return (
        doc.fullName.toLowerCase().includes(query) ||
        doc.specialization.toLowerCase().includes(query) ||
        doc.licenseNo.toLowerCase().includes(query) ||
        doc.email.toLowerCase().includes(query)
      );
    });
  }, [doctorsWithStatus, search, filterTab]);

  // Directory statistics
  const totalCount = doctors.length;
  const onDutyCount = doctorsWithStatus.filter((d) => d.isOnDutyToday).length;
  const activeCount = doctors.filter((d) => d.isActive).length;
  const onLeaveCount = doctorsWithStatus.filter((d) => d.isBlockedNow || d.upcomingBlocks.length > 0).length;

  // Leave history statistics
  const activeLeavesCount = leaveRecords.filter((r) => r.status === "active_now").length;
  const upcomingLeavesCount = leaveRecords.filter((r) => r.status === "upcoming").length;
  const completedLeavesCount = leaveRecords.filter((r) => r.status === "completed").length;

  // Filtered leave records
  const filteredLeaveRecords = useMemo(() => {
    let list = leaveRecords;

    if (leaveDoctorFilter !== "all") {
      list = list.filter((r) => r.dentistId === leaveDoctorFilter);
    }

    if (leaveStatusFilter !== "all") {
      list = list.filter((r) => r.status === leaveStatusFilter);
    }

    const q = leaveSearch.toLowerCase().trim();
    if (!q) return list;

    return list.filter((r) =>
      r.dentistName.toLowerCase().includes(q) ||
      r.specialization.toLowerCase().includes(q) ||
      r.licenseNo.toLowerCase().includes(q) ||
      r.blockType.toLowerCase().includes(q) ||
      (r.reason && r.reason.toLowerCase().includes(q))
    );
  }, [leaveRecords, leaveDoctorFilter, leaveStatusFilter, leaveSearch]);

  const selectedDoctorFilterName = useMemo(() => {
    if (leaveDoctorFilter === "all") return null;
    return doctors.find((d) => d.id === leaveDoctorFilter)?.fullName ?? null;
  }, [doctors, leaveDoctorFilter]);

  return (
    <div className="space-y-6 pb-8">
      {/* HERO BANNER */}
      <PageHeroBanner
        icon={Stethoscope}
        title="Doctors Directory & Leave History"
        description="Clinical credentials, working shifts, and comprehensive doctor leave records"
        badgeText="Practitioners Roster"
      >
        <div className="flex items-center gap-1.5 bg-muted/70 p-1 rounded-xl border border-border/70">
          <Button
            size="sm"
            variant={viewMode === "directory" ? "default" : "ghost"}
            onClick={() => setViewMode("directory")}
            className="h-8 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Doctors Directory
          </Button>
          <Button
            size="sm"
            variant={viewMode === "leave_history" ? "default" : "ghost"}
            onClick={() => setViewMode("leave_history")}
            className="h-8 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <CalendarOff className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            Leave History ({leaveRecords.length})
            {activeLeavesCount > 0 && (
              <Badge variant="outline" className="ml-1.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40 text-[10px] font-bold px-1.5 py-0">
                {activeLeavesCount} Active
              </Badge>
            )}
          </Button>
        </div>
      </PageHeroBanner>

      {/* ========================================================================= */}
      {/* TAB 1: DOCTORS DIRECTORY VIEW */}
      {/* ========================================================================= */}
      {viewMode === "directory" && (
        <div className="space-y-6">
          {/* METRICS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card-glow">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Practitioners</p>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 text-cyan-600 border border-cyan-500/30 flex items-center justify-center">
                  <Users className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-black tracking-tight text-foreground tabular-nums">
                {totalCount}
              </p>
              <div className="mt-2 text-[11px] text-muted-foreground font-medium">
                Registered clinic dentists
              </div>
            </div>

            <div className="stat-card-glow">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">On Duty Today</p>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-600 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-black tracking-tight text-foreground tabular-nums">
                {onDutyCount}
              </p>
              <div className="mt-2 text-[11px] text-muted-foreground font-medium">
                Active chairs scheduled today
              </div>
            </div>

            <div className="stat-card-glow">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Licenses</p>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-600 border border-indigo-500/30 flex items-center justify-center">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-black tracking-tight text-foreground tabular-nums">
                {activeCount}
              </p>
              <div className="mt-2 text-[11px] text-muted-foreground font-medium">
                Verified PRC credentials
              </div>
            </div>

            <div
              onClick={() => setViewMode("leave_history")}
              className="stat-card-glow cursor-pointer hover:border-amber-500/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Leaves / Blocks</p>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-600 border border-amber-500/30 flex items-center justify-center">
                  <CalendarOff className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-black tracking-tight text-foreground tabular-nums">
                {onLeaveCount}
              </p>
              <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-between">
                <span>Scheduled leaves</span>
                <span>View History &rarr;</span>
              </div>
            </div>
          </div>

          {/* SEARCH AND FILTER BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by doctor name, specialization, or PRC license..."
                className="pl-9 h-10 rounded-xl bg-card border-border/80 text-xs shadow-2xs"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/60 self-start sm:self-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterTab === "all"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("on_duty")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterTab === "on_duty"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                On Duty ({onDutyCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("active")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterTab === "active"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("on_leave")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterTab === "on_leave"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                On Leave ({onLeaveCount})
              </button>
            </div>
          </div>

          {/* DOCTORS GRID */}
          {filteredDoctors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDoctors.map((doc) => {
                const scheduledDays = new Set(doc.schedules.map((s) => s.dayOfWeek));

                return (
                  <Card
                    key={doc.id}
                    className="border border-border/70 bg-card rounded-2xl shadow-xs hover:shadow-md hover:border-cyan-500/40 transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <CardContent className="p-5 space-y-4">
                      {/* Doctor Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-cyan-600/20 to-teal-500/20 text-cyan-700 dark:text-cyan-300 font-black text-sm flex items-center justify-center border border-cyan-500/30 shrink-0">
                            {doc.fullName
                              .replace("Dr. ", "")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-foreground leading-tight">
                              {doc.fullName}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {doc.specialization}
                            </p>
                          </div>
                        </div>

                        {/* On Duty Status Badge */}
                        {doc.isOnDutyToday ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 shrink-0">
                            On Duty
                          </Badge>
                        ) : doc.isBlockedNow ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold px-2 py-0.5 shrink-0">
                            On Leave
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-border/60 text-[10px] font-medium px-2 py-0.5 shrink-0">
                            Off Duty
                          </Badge>
                        )}
                      </div>

                      {/* Credentials & Details */}
                      <div className="p-3 rounded-xl bg-muted/20 border border-border/50 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>PRC License:</span>
                          <span className="font-mono font-bold text-foreground">{doc.licenseNo}</span>
                        </div>
                        {doc.email && (
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Email:</span>
                            <span className="truncate max-w-[180px] font-medium text-foreground">{doc.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Operating Days Visualizer */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-cyan-600" />
                            Working Days
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            {doc.schedules.length} {doc.schedules.length === 1 ? "day" : "days"} / week
                          </span>
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                          {DAY_LABELS.map((dayName, idx) => {
                            const isScheduled = scheduledDays.has(idx);
                            const isToday = idx === todayDayOfWeek;

                            return (
                              <div
                                key={dayName}
                                className={`flex flex-col items-center py-1.5 rounded-lg text-center transition-all ${
                                  isToday && isScheduled
                                    ? "bg-cyan-600 text-white font-bold ring-1 ring-cyan-500 shadow-2xs"
                                    : isScheduled
                                    ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/30"
                                    : "bg-muted/30 text-muted-foreground/50 text-[10px]"
                                }`}
                              >
                                <span className="text-[10px] uppercase tracking-tighter">
                                  {dayName.slice(0, 1)}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Today's Operating Hours */}
                        {doc.todaySchedule && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-xl">
                            <Clock className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                            <span className="text-[11px]">
                              Today: <strong className="text-foreground">{formatTime(doc.todaySchedule.startTime)} – {formatTime(doc.todaySchedule.endTime)}</strong>
                            </span>
                          </div>
                        )}

                        {/* Upcoming Leave Notice */}
                        {doc.upcomingBlocks.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-[11px] truncate">
                              Upcoming leave: {new Date(doc.upcomingBlocks[0].startDatetime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              {doc.upcomingBlocks[0].reason ? ` (${doc.upcomingBlocks[0].reason})` : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>

                    {/* Card Actions Footer */}
                    <div className="p-3 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        onClick={() => setSelectedDoctorForShifts(doc)}
                        className="flex-1 h-8 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-2xs cursor-pointer"
                      >
                        <Clock className="mr-1.5 h-3.5 w-3.5" />
                        <span>Work Shifts</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setLeaveDoctorFilter(doc.id);
                          setViewMode("leave_history");
                        }}
                        className="h-8 rounded-xl text-xs font-medium border-border/70 hover:bg-muted cursor-pointer"
                      >
                        <CalendarOff className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
                        <span>Leave History</span>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border/70">
              <Stethoscope className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="font-semibold text-foreground text-sm">No doctors found</p>
              <p className="mt-1">Try adjusting your search criteria or filter tabs.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LEAVE & TIME-OFF HISTORY VIEW */}
      {/* ========================================================================= */}
      {viewMode === "leave_history" && (
        <div className="space-y-6">
          {/* LEAVE STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card-glow">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Leaves Now</p>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-600 border border-amber-500/30 flex items-center justify-center">
                  <CalendarOff className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-black tracking-tight text-foreground tabular-nums">
                {activeLeavesCount}
              </p>
              <div className="mt-2 text-[11px] text-muted-foreground font-medium">
                Currently away from clinic
              </div>
            </div>

            <div className="stat-card-glow">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upcoming Leaves</p>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-500/20 to-cyan-500/20 text-blue-600 border border-blue-500/30 flex items-center justify-center">
                  <CalendarDays className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-black tracking-tight text-foreground tabular-nums">
                {upcomingLeavesCount}
              </p>
              <div className="mt-2 text-[11px] text-muted-foreground font-medium">
                Scheduled future leaves
              </div>
            </div>

            <div className="stat-card-glow">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Completed Leaves</p>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-slate-500/20 to-zinc-500/20 text-slate-600 border border-slate-500/30 flex items-center justify-center">
                  <History className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-black tracking-tight text-foreground tabular-nums">
                {completedLeavesCount}
              </p>
              <div className="mt-2 text-[11px] text-muted-foreground font-medium">
                Past doctor time-off logs
              </div>
            </div>

            <div className="stat-card-glow">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Leave Records</p>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 text-teal-600 border border-teal-500/30 flex items-center justify-center">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-black tracking-tight text-foreground tabular-nums">
                {leaveRecords.length}
              </p>
              <div className="mt-2 text-[11px] text-muted-foreground font-medium">
                Historical clinic roster
              </div>
            </div>
          </div>

          {/* LEAVE SEARCH AND FILTER BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={leaveSearch}
                onChange={(e) => setLeaveSearch(e.target.value)}
                placeholder="Search by doctor, specialization, or leave reason..."
                className="pl-9 h-9 rounded-xl bg-muted/40 border-border/80 text-xs shadow-2xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Doctor Filter Pill if filtered */}
              {selectedDoctorFilterName && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-xs font-semibold">
                  <span>Dr: {selectedDoctorFilterName}</span>
                  <button
                    type="button"
                    onClick={() => setLeaveDoctorFilter("all")}
                    className="hover:opacity-80 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Status Filter Buttons */}
              <div className="inline-flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/60 text-xs">
                <button
                  type="button"
                  onClick={() => setLeaveStatusFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    leaveStatusFilter === "all"
                      ? "bg-card text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({leaveRecords.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveStatusFilter("active_now")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    leaveStatusFilter === "active_now"
                      ? "bg-card text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Active ({activeLeavesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveStatusFilter("upcoming")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    leaveStatusFilter === "upcoming"
                      ? "bg-card text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Upcoming ({upcomingLeavesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveStatusFilter("completed")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    leaveStatusFilter === "completed"
                      ? "bg-card text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Past ({completedLeavesCount})
                </button>
              </div>
            </div>
          </div>

          {/* LEAVE RECORDS AUDIT TABLE */}
          <Card className="border border-border/70 bg-card rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="p-5 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-amber-500" />
                Doctor Leave & Time-Off Audit History
              </CardTitle>
              <CardDescription className="text-xs">
                Historical and upcoming absence records configured across all attending clinical doctors
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredLeaveRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/50">
                      <tr>
                        <th className="py-3 px-4 text-left">Doctor & Credentials</th>
                        <th className="py-3 px-3 text-left">Leave Type</th>
                        <th className="py-3 px-3 text-left">Period / Dates</th>
                        <th className="py-3 px-3 text-center">Duration</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-4 text-left">Reason / Clinical Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredLeaveRecords.map((item) => {
                        const typeConfig = BLOCK_TYPE_CONFIG[item.blockType] || BLOCK_TYPE_CONFIG.other;

                        return (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-bold text-xs flex items-center justify-center shrink-0">
                                  {item.dentistName
                                    .replace("Dr. ", "")
                                    .slice(0, 1)}
                                </div>
                                <div>
                                  <p className="font-bold text-foreground">{item.dentistName}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {item.specialization} &bull; PRC: {item.licenseNo}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <Badge
                                variant="outline"
                                className={`${typeConfig.bg} ${typeConfig.text} ${typeConfig.border} text-[10px] font-bold px-2 py-0.5`}
                              >
                                {typeConfig.label}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                              <div className="space-y-0.5">
                                <p className="font-semibold text-foreground">
                                  {formatDateTime(item.startDatetime)}
                                </p>
                                <p className="text-[10px]">
                                  to {formatDateTime(item.endDatetime)}
                                </p>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <Badge variant="outline" className="border-border text-foreground font-mono text-[10px] font-semibold">
                                {formatDuration(item.startDatetime, item.endDatetime)}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {item.status === "active_now" ? (
                                <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 shadow-2xs">
                                  Active Now
                                </Badge>
                              ) : item.status === "upcoming" ? (
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-bold px-2 py-0.5">
                                  Upcoming
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-muted text-muted-foreground border-border/60 text-[10px] font-medium px-2 py-0.5">
                                  Completed
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-foreground font-medium">
                              {item.reason || <span className="text-muted-foreground italic font-normal">No details provided</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  <CalendarOff className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="font-semibold text-foreground text-sm">No leave records found</p>
                  <p className="mt-1">There are no leave records matching your current filter criteria.</p>
                  {selectedDoctorFilterName && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLeaveDoctorFilter("all")}
                      className="mt-3 text-xs"
                    >
                      Clear Doctor Filter
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IN-PAGE READ-ONLY WORK SHIFTS DIALOG */}
      {/* ========================================================================= */}
      <Dialog
        open={selectedDoctorForShifts !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedDoctorForShifts(null);
        }}
      >
        <DialogContent className="sm:max-w-lg bg-card border border-border shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4 text-cyan-600" />
                  {selectedDoctorForShifts?.fullName} — Working Shifts
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {selectedDoctorForShifts?.specialization} &bull; PRC License: {selectedDoctorForShifts?.licenseNo}
                </DialogDescription>
              </div>
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-[10px] py-0.5 px-2 shrink-0">
                Doctor-Managed (Read-Only)
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground">
              <Info className="h-4 w-4 text-cyan-600 shrink-0" />
              <span>
                Doctors configure and update their own operating shifts directly in their Dentist Portal.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DAY_LABELS.map((dayName, idx) => {
                const shift = selectedDoctorForShifts?.schedules.find((s) => s.dayOfWeek === idx);
                const isActive = Boolean(shift && shift.isActive);

                return (
                  <div
                    key={dayName}
                    className={`p-3 rounded-xl border transition-all ${
                      isActive
                        ? "border-cyan-500/30 bg-cyan-500/5 shadow-2xs"
                        : "border-border/50 bg-muted/20 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">{dayName}</span>
                      {isActive ? (
                        <Badge variant="outline" className="bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 text-[10px] font-bold px-1.5 py-0">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-border text-muted-foreground text-[10px] font-medium px-1.5 py-0">
                          Off Duty
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 text-xs font-mono font-semibold">
                      {isActive && shift ? (
                        <span className="text-foreground">
                          {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-normal text-[11px]">No shift scheduled</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-border/50 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedDoctorForShifts) {
                  setLeaveDoctorFilter(selectedDoctorForShifts.id);
                  setSelectedDoctorForShifts(null);
                  setViewMode("leave_history");
                }
              }}
              className="text-xs font-medium cursor-pointer"
            >
              <CalendarOff className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
              View Leave History
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setSelectedDoctorForShifts(null)}
              className="bg-primary text-primary-foreground text-xs font-semibold rounded-xl cursor-pointer"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
