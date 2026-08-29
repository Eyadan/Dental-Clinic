"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, Shield, ChevronLeft, ChevronRight, Filter } from "lucide-react";
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

  const loadLogs = useCallback(async () => {
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

    if (result.success && result.data) {
      setLogs(result.data.logs);
      setTotal(result.data.total);
    } else {
      setError(result.error ?? "Failed to fetch audit logs");
    }
    setIsLoading(false);
  }, [entityType, userId, startDate, endDate, page]);

  useEffect(() => {
    getStaffUsersAction().then((res) => {
      if (res.success && res.data) setStaffUsers(res.data);
    });
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleFilter = () => {
    setPage(1);
    loadLogs();
  };

  const handleClear = () => {
    setEntityType("");
    setUserId("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Audit Logs
        </h1>
        <p className="text-muted-foreground">Immutable record of all system actions</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={entityType} onValueChange={(v) => v && setEntityType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={userId} onValueChange={(v) => v && setUserId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  {staffUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={handleFilter}>Apply Filters</Button>
            <Button size="sm" variant="outline" onClick={handleClear}>Clear</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Shield className="mb-2 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                    <th className="px-4 py-3 text-left font-medium">Entity</th>
                    <th className="px-4 py-3 text-left font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString("en-PH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium">{log.user_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{log.action}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.entity_type}
                        {log.entity_id && (
                          <span className="block text-xs">{log.entity_id.substring(0, 8)}...</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="flex items-center px-2 text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
