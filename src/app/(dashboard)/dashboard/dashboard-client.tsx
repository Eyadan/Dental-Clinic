"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Phone, MessageSquare } from "lucide-react";
import {
  getDashboardStatsAction,
  getPendingStaffNotificationsAction,
  dismissStaffNotificationAction,
  type StaffNotification,
} from "./actions";

export function DashboardClient() {
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

  return (
    <div className="space-y-6">
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const meta = notif.metadata ?? {};
            const patientPsid = (meta.patient_psid as string) ?? "unknown";
            const notifType = (meta.notification_type as string) ?? "unknown";
            const reason = (meta.reason as string) ?? "Unknown error";

            return (
              <Alert key={notif.id} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Messenger notification failed ({notifType})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PSID: {patientPsid} — {reason}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Please contact the patient directly.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDismiss(notif.id)}
                      disabled={isPending}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Dismiss
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats?.pendingBookings ?? "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Today&apos;s Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats?.todayAppointments ?? "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">In Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats?.inQueue ?? "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Unread Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats?.unreadMessages ?? "—"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
