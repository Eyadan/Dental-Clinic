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
    label: "Appointments",
    href: "/appointments",
    icon: CalendarDays,
    roles: ["admin", "reception", "dentist"],
  },
  {
    label: "Queue",
    href: "/queue",
    icon: ListOrdered,
    roles: ["admin", "reception", "dentist"],
  },
  {
    label: "Consultation",
    href: "/consultation",
    icon: Stethoscope,
    roles: ["admin", "dentist"],
  },
  {
    label: "Consent",
    href: "/consent",
    icon: FileCheck,
    roles: ["admin", "reception", "dentist"],
  },
  {
    label: "Patients",
    href: "/patients",
    icon: Users,
    roles: ["admin", "reception", "dentist"],
  },
  {
    label: "Schedule & Leave",
    href: "/dentists/unavailability",
    icon: CalendarX,
    roles: ["admin", "reception", "dentist"],
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
    roles: ["admin", "reception", "dentist"],
  },
  {
    label: "Bookings",
    href: "/bookings",
    icon: CalendarPlus,
    roles: ["admin", "reception", "dentist"],
  },
  {
    label: "Check-In",
    href: "/check-in",
    icon: UserCheck,
    roles: ["admin", "reception", "dentist"],
  },
  {
    label: "Waitlist",
    href: "/waitlist",
    icon: ListPlus,
    roles: ["reception"],
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
    label: "Analytics",
    href: "/reports",
    icon: TrendingUp,
    roles: ["admin"],
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

// Sequential flow ordering mapped per role to ensure zero confusion
const DENTIST_FLOW_ORDER = [
  "/dashboard",
  "/appointments",
  "/queue",
  "/consultation",
  "/consent",
  "/patients",
  "/dentists/unavailability",
  "/billing",
  "/chat",
  "/bookings",
  "/check-in",
];

const RECEPTION_FLOW_ORDER = [
  "/dashboard",
  "/check-in",
  "/queue",
  "/appointments",
  "/bookings",
  "/waitlist",
  "/patients",
  "/consent",
  "/billing",
  "/chat",
  "/dentists/unavailability",
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  const roleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  if (role === "dentist") {
    return [...roleItems].sort((a, b) => {
      const idxA = DENTIST_FLOW_ORDER.indexOf(a.href);
      const idxB = DENTIST_FLOW_ORDER.indexOf(b.href);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  }

  if (role === "reception") {
    return [...roleItems].sort((a, b) => {
      const idxA = RECEPTION_FLOW_ORDER.indexOf(a.href);
      const idxB = RECEPTION_FLOW_ORDER.indexOf(b.href);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  }

  return roleItems;
}
