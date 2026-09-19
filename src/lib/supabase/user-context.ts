import { headers } from "next/headers";
import { createServerSupabaseClient } from "./server-client";
import { USER_ID_HEADER, USER_ROLE_HEADER } from "./middleware-client";
import type { UserRole } from "@/lib/types/enums";

export interface ServerUserContext {
  userId: string | null;
  role: UserRole | null;
}

/**
 * Returns the verified user id and role for the current request.
 * Reads middleware-injected headers first (zero DB calls), falls back to
 * Supabase auth + users table for contexts where middleware didn't run.
 */
export async function getServerUserContext(): Promise<ServerUserContext> {
  const h = await headers();
  const userId = h.get(USER_ID_HEADER);
  const role = h.get(USER_ROLE_HEADER) as UserRole | null;
  if (userId && role) {
    return { userId, role };
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { userId: null, role: null };
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  return { userId: user.id, role: (appUser?.role ?? null) as UserRole | null };
}
