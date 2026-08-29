"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Power, PowerOff } from "lucide-react";
import type { DentalService } from "@/lib/types/database";

interface ServiceListProps {
  services: DentalService[];
  onEdit: (service: DentalService) => void;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
}

export function ServiceList({ services, onEdit, onToggleActive }: ServiceListProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleToggle = (service: DentalService) => {
    setPendingId(service.id);
    startTransition(async () => {
      await onToggleActive(service.id, !service.is_active);
      setPendingId(null);
    });
  };

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-muted-foreground">No dental services found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Click &quot;New Service&quot; to add your first dental service.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[120px]">Duration</TableHead>
            <TableHead className="w-[120px]">Price</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow key={service.id}>
              <TableCell className="font-medium">{service.name}</TableCell>
              <TableCell className="text-muted-foreground max-w-[300px] truncate">
                {service.description ?? "—"}
              </TableCell>
              <TableCell>
                {service.default_duration_minutes} min
              </TableCell>
              <TableCell className="tabular-nums">
                ₱{Number(service.default_price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell>
                <Badge variant={service.is_active ? "default" : "secondary"}>
                  {service.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm" disabled={pendingId === service.id}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(service)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleToggle(service)}
                      className={service.is_active ? "text-destructive" : ""}
                    >
                      {service.is_active ? (
                        <>
                          <PowerOff className="mr-2 h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Power className="mr-2 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
