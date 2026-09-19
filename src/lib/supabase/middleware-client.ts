import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/lib/types/enums";

export const USER_ID_HEADER = "x-user-id";
export const USER_ROLE_HEADER = "x-user-role";

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(USER_ID_HEADER);
  requestHeaders.delete(USER_ROLE_HEADER);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  let role: UserRole | null = null;
  if (user) {
    const { data: appUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    role = (appUser?.role ?? null) as UserRole | null;
  }

  if (user && role) {
    requestHeaders.set(USER_ID_HEADER, user.id);
    requestHeaders.set(USER_ROLE_HEADER, role);
    const cookies = supabaseResponse.cookies.getAll();
    supabaseResponse = NextResponse.next({
      request: { headers: requestHeaders },
    });
    cookies.forEach((cookie) =>
      supabaseResponse.cookies.set(cookie.name, cookie.value, cookie),
    );
  }

  return { supabaseResponse, supabase, user, role };
}
