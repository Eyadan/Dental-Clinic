import { type NextRequest, NextResponse } from "next/server";
import { updateSession, USER_ID_HEADER, USER_ROLE_HEADER } from "@/lib/supabase/middleware-client";
import type { UserRole } from "@/lib/types/enums";

const PUBLIC_ROUTES = ["/login", "/unauthorized", "/register", "/api/webhooks", "/api/cron", "/api/messenger-profile"];

const ROLE_ROUTES: Record<string, UserRole[]> = {
  "/settings": ["admin"],
  "/services": ["admin"],
  "/reports": ["admin"],
  "/audit": ["admin"],
  "/patients/archived": ["admin"],
  "/consultation": ["dentist"],
  "/consent": ["dentist"],
  "/dentist-portal": ["dentist"],
  "/check-in": ["reception"],
  "/chat": ["reception"],
  "/bookings": ["reception"],
  "/appointments/new": ["reception"],
  "/patients/new": ["reception"],
  "/dentists/unavailability": ["reception", "dentist"],
  "/dentists": ["admin"],
  "/waitlist": ["reception"],
  "/queue": ["reception", "dentist"],
};

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function getAllowedRoles(pathname: string): UserRole[] | null {
  for (const [prefix, roles] of Object.entries(ROLE_ROUTES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return roles;
    }
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    const headers = new Headers(request.headers);
    headers.delete(USER_ID_HEADER);
    headers.delete(USER_ROLE_HEADER);
    return NextResponse.next({ request: { headers } });
  }

  const { supabaseResponse, user, role } = await updateSession(request);

  if (!user || !role) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Gracefully redirect admins from deprecated schedule/leave URLs to the integrated Doctors Directory
  if (
    role === "admin" &&
    (pathname === "/dentists/unavailability" ||
      pathname.startsWith("/dentists/unavailability/") ||
      /^\/dentists\/[^/]+\/schedule/.test(pathname))
  ) {
    return NextResponse.redirect(new URL("/dentists", request.url));
  }

  const allowedRoles = getAllowedRoles(pathname);
  if (allowedRoles && !allowedRoles.includes(role)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
