/**
 * Returns the current date in YYYY-MM-DD format using local timezone.
 * Use this instead of `new Date().toISOString().split("T")[0]` which
 * shifts the date back in positive UTC offset timezones (e.g., UTC+8).
 */
export function todayLocal(): string {
  return formatDateLocal(new Date());
}

/**
 * Formats a Date object as YYYY-MM-DD using local timezone components.
 * Avoids the UTC conversion that `toISOString()` performs.
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns the last day of the given month as YYYY-MM-DD using local timezone.
 * @param year - Full year (e.g., 2026)
 * @param monthNum - 1-indexed month (1=January, 12=December)
 */
export function endOfMonthLocal(year: number, monthNum: number): string {
  const lastDay = new Date(year, monthNum, 0).getDate();
  return `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}
