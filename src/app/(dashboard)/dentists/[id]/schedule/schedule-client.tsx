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
import type { Dentist, DentistSchedule, DentistBlock } from "@/lib/types/database";

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

interface ScheduleClientProps {
  dentist: Dentist;
  schedules: DentistSchedule[];
  blocks: DentistBlock[];
}

export function ScheduleClient({ dentist, schedules, blocks }: ScheduleClientProps) {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [, startTransition] = useTransition();

  const handleDeleteSchedule = (scheduleId: string) => {
    startTransition(async () => {
      await deleteScheduleAction(scheduleId, dentist.id);
    });
  };

  const handleDeleteBlock = (blockId: string) => {
    startTransition(async () => {
      await deleteBlockAction(blockId, dentist.id);
    });
  };

  const handleCreateSchedule = async (formData: FormData) => {
    return createScheduleAction(dentist.id, formData);
  };

  const handleCreateBlock = async (formData: FormData) => {
    return createBlockAction(dentist.id, formData);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Schedule — {dentist.license_no}
        </h1>
        <p className="text-muted-foreground">
          {dentist.specialization ?? "General Dentistry"}
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
          {schedules.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No working schedules set. Click &quot;Add Schedule&quot; to configure.
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
                  {schedules.map((schedule) => (
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
          {blocks.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No time-off blocks. Click &quot;Add Block&quot; to create one.
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
                  {blocks.map((block) => (
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
        dentistId={dentist.id}
        onSubmit={handleCreateSchedule}
      />
      <BlockFormDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        dentistId={dentist.id}
        onSubmit={handleCreateBlock}
      />
    </div>
  );
}
