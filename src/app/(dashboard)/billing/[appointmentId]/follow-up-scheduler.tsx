"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createFollowUpAction } from "./actions";
import { todayLocal } from "@/lib/utils/date-utils";
import { Loader2, CalendarPlus } from "lucide-react";

interface FollowUpSchedulerProps {
  appointmentId: string;
  services: { id: string; name: string }[];
}

export function FollowUpScheduler({ appointmentId, services }: FollowUpSchedulerProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSchedule = async () => {
    if (!date || !time) {
      setError("Date and time are required");
      return;
    }

    setIsScheduling(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createFollowUpAction(appointmentId, date, time, selectedServices);
      if (result.success && result.data) {
        setSuccess(`Follow-up scheduled — Ref: ${result.data.referenceNo}`);
        setDate("");
        setTime("");
        setSelectedServices([]);
      } else {
        setError(result.error ?? "Failed to schedule follow-up");
      }
    } finally {
      setIsScheduling(false);
    }
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarPlus className="h-4 w-4" />
          Schedule Follow-Up
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="followup-date">Date</Label>
            <Input
              id="followup-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={todayLocal()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="followup-time">Time</Label>
            <Input
              id="followup-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        {services.length > 0 && (
          <div className="space-y-2">
            <Label>Services (optional)</Label>
            <div className="flex flex-wrap gap-1.5">
              {services.map((service) => (
                <Button
                  key={service.id}
                  type="button"
                  size="sm"
                  variant={selectedServices.includes(service.id) ? "default" : "outline"}
                  onClick={() => toggleService(service.id)}
                >
                  {service.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <Button onClick={handleSchedule} disabled={isScheduling || !date || !time} size="sm">
          {isScheduling ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <CalendarPlus className="mr-2 h-3 w-3" />
          )}
          Schedule Follow-Up
        </Button>
      </CardContent>
    </Card>
  );
}
