import {
  LayoutDashboard,
  CalendarPlus,
  Users,
  CalendarDays,
  ListOrdered,
  Sparkles,
  Stethoscope,
  FileCheck,
  Receipt,
  MessageSquare,
  Settings,
  UserCheck,
  CalendarX,
  ListPlus,
  Shield,
  Archive,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/types/enums";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "reception", "dentist"],
  },
  {
    label: "Analytics",
    href: "/reports",
    icon: TrendingUp,
    roles: ["admin"],
  },
  {
    label: "Bookings",
    href: "/bookings",
    icon: CalendarPlus,
    roles: ["reception"],
  },
  {
    label: "Patients",
    href: "/patients",
    icon: Users,
    roles: ["admin", "reception", "dentist"],
  },
  {
    label: "Appointments",
    href: "/appointments",
    icon: CalendarDays,
    roles: ["admin", "reception", "dentist"],
  },
  {
    label: "Check-In",
    href: "/check-in",
    icon: UserCheck,
    roles: ["reception"],
  },
  {
    label: "Queue",
    href: "/queue",
    icon: ListOrdered,
    roles: ["reception", "dentist"],
  },
  {
    label: "Doctors",
    href: "/dentists",
    icon: Stethoscope,
    roles: ["admin"],
  },
  {
    label: "Services",
    href: "/services",
    icon: Sparkles,
    roles: ["admin"],
  },
  {
    label: "Consultation",
    href: "/consultation",
    icon: Stethoscope,
    roles: ["dentist"],
  },
  {
    label: "Consent",
    href: "/consent",
    icon: FileCheck,
    roles: ["dentist"],
  },
  {
    label: "Billing",
    href: "/billing",
    icon: Receipt,
    roles: ["admin", "reception", "dentist"],
  },
  {
    label: "Live Chat",
    href: "/chat",
    icon: MessageSquare,
    roles: ["reception"],
  },
  {
    label: "Schedule & Leave",
    href: "/dentists/unavailability",
    icon: CalendarX,
    roles: ["reception", "dentist"],
  },
  {
    label: "Waitlist",
    href: "/waitlist",
    icon: ListPlus,
    roles: ["reception"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["admin"],
  },
  {
    label: "Audit Logs",
    href: "/audit",
    icon: Shield,
    roles: ["admin"],
  },
  {
    label: "Archived",
    href: "/patients/archived",
    icon: Archive,
    roles: ["admin"],
  },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
