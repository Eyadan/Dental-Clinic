/**
 * Supabase foreign-key joins can return either a single object or an array
 * depending on the relationship and request shape. This helper normalises the
 * result to a single record (or null) so callers don't need to handle both
 * shapes everywhere.
 */
export function getSingleJoined<T>(value: unknown): T | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return (value[0] as T | undefined) ?? null;
  }

  return value as T;
}
