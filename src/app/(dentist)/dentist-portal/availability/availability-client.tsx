"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScheduleFormDialog } from "@/components/dentists/schedule-form-dialog";
import { BlockFormDialog } from "@/components/dentists/block-form-dialog";
import {
  createScheduleAction,
  deleteScheduleAction,
  createBlockAction,
  deleteBlockAction,
} from "./actions";
import { Plus, Trash2, Clock, CalendarOff } from "lucide-react";
import type { DentistSchedule, DentistBlock } from "@/lib/types/database";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const BLOCK_TYPE_LABELS: Record<string, string> = {
  vacation: "Vacation",
  break: "Break",
  sick_leave: "Sick Leave",
  other: "Other",
};

const RECURRENCE_LABELS: Record<string, string> = {
  none: "One-time",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

interface AvailabilityClientProps {
  dentistId: string;
  dentistName: string;
  schedules: DentistSchedule[];
  blocks: DentistBlock[];
}

export function AvailabilityClient({
  dentistId,
  dentistName,
  schedules,
  blocks,
}: AvailabilityClientProps) {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [, startTransition] = useTransition();

  const handleDeleteSchedule = (scheduleId: string) => {
    startTransition(async () => {
      await deleteScheduleAction(scheduleId);
    });
  };

  const handleDeleteBlock = (blockId: string) => {
    startTransition(async () => {
      await deleteBlockAction(blockId);
    });
  };

  const handleCreateSchedule = async (formData: FormData) => {
    return createScheduleAction(dentistId, formData);
  };

  const handleCreateBlock = async (formData: FormData) => {
    return createBlockAction(dentistId, formData);
  };

  const sortedSchedules = [...schedules].sort((a, b) => a.day_of_week - b.day_of_week);
  const upcomingBlocks = blocks
    .filter((b) => new Date(b.end_datetime) > new Date())
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <h1 className="text-xl font-bold">My Availability</h1>
        <p className="text-sm text-muted-foreground">
          Manage your weekly working schedule and time-off blocks.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Working Schedules
          </CardTitle>
          <Button size="sm" onClick={() => setScheduleDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Schedule
          </Button>
        </CardHeader>
        <CardContent>
          {sortedSchedules.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No working schedules set. Click &quot;Add Schedule&quot; to configure your weekly availability.
            </p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSchedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">
                        {DAY_NAMES[schedule.day_of_week]}
                      </TableCell>
                      <TableCell>{schedule.start_time}</TableCell>
                      <TableCell>{schedule.end_time}</TableCell>
                      <TableCell>
                        <Badge variant={schedule.is_active ? "default" : "secondary"}>
                          {schedule.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarOff className="h-5 w-5" />
            Time-Off Blocks
          </CardTitle>
          <Button size="sm" onClick={() => setBlockDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Block
          </Button>
        </CardHeader>
        <CardContent>
          {upcomingBlocks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No upcoming time-off blocks. Click &quot;Add Block&quot; to declare vacation, sick leave, or other time off.
            </p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Recurrence</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingBlocks.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell>
                        {new Date(block.start_datetime).toLocaleString("en-PH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell>
                        {new Date(block.end_datetime).toLocaleString("en-PH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {BLOCK_TYPE_LABELS[block.block_type] ?? block.block_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {RECURRENCE_LABELS[block.recurrence_rule] ?? block.recurrence_rule}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {block.reason ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeleteBlock(block.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ScheduleFormDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        dentistId={dentistId}
        onSubmit={handleCreateSchedule}
      />
      <BlockFormDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        dentistId={dentistId}
        onSubmit={handleCreateBlock}
      />
    </div>
  );
}
