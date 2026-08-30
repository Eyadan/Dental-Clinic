"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Shield, ChevronLeft, ChevronRight, Filter, ShieldAlert, CheckCircle2 } from "lucide-react";
import { getAuditLogsAction, getStaffUsersAction, type AuditLogEntry } from "./actions";

const ENTITY_TYPES = [
  { value: "appointment", label: "Appointment" },
  { value: "patient", label: "Patient" },
  { value: "dentist", label: "Dentist" },
  { value: "clinic_settings", label: "Settings" },
  { value: "waitlist_entry", label: "Waitlist" },
];

export function AuditLogClient() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [entityType, setEntityType] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [staffUsers, setStaffUsers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getStaffUsersAction().then((res) => {
      if (res.success && res.data) {
        setStaffUsers(res.data);
      }
    });
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getAuditLogsAction({
      entityType: entityType || undefined,
      userId: userId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      pageSize,
    });
    setIsLoading(false);

    if (result.success && result.data) {
      setLogs(result.data.logs);
      setTotal(result.data.total);
    } else {
      setError(result.error ?? "Failed to load audit logs");
    }
  }, [entityType, userId, startDate, endDate, page, pageSize]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / pageSize);

  const handleClearFilters = () => {
    setEntityType("");
    setUserId("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* BRANDED HERO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/60 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Security Audit Trail</h1>
              <Badge variant="outline" className="border-border text-foreground font-mono text-[10px]">
                {total} logged
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Immutable audit record of system operations and staff actions</p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-2xl border-red-500/20 bg-red-500/5">
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {/* FILTER CARD */}
      <Card className="border-border/60 bg-card rounded-2xl shadow-xs p-1">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Entity Module</Label>
              <Select value={entityType} onValueChange={(val) => { setEntityType(val === "all" || !val ? "" : val); setPage(1); }}>
                <SelectTrigger className="h-9 text-xs border-border/60 rounded-xl">
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="text-xs">All Modules</SelectItem>
                  {ENTITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Staff Member</Label>
              <Select value={userId} onValueChange={(val) => { setUserId(val === "all" || !val ? "" : val); setPage(1); }}>
                <SelectTrigger className="h-9 text-xs border-border/60 rounded-xl">
                  <SelectValue placeholder="All Staff Users" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="text-xs">All Staff Users</SelectItem>
                  {staffUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="h-9 text-xs border-border/60 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="h-9 text-xs border-border/60 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button variant="outline" size="sm" onClick={handleClearFilters} className="h-8 text-xs border-border/60 rounded-xl">
              <Filter className="mr-1 h-3 w-3" /> Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AUDIT TABLE */}
      <Card className="border-border/60 bg-card rounded-2xl shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground space-y-1">
              <Shield className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p>No audit log entries match your filter criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {logs.map((log) => (
                <div key={log.id} className="p-3.5 hover:bg-muted/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{log.action}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono border-border">{log.entity_type}</Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      By: <span className="font-semibold text-foreground">{log.user_name}</span>
                    </p>
                  </div>
                  <div className="text-right sm:text-right">
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString("en-PH")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-border/60 bg-muted/20 text-xs">
              <span className="text-muted-foreground">
                Page {page} of {totalPages} ({total} entries)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 w-8 p-0 rounded-xl"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-8 w-8 p-0 rounded-xl"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
