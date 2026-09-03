import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseAllergies(allergiesStr: string | null | undefined): string[] {
  if (!allergiesStr) return [];
  const trimmed = allergiesStr.trim();
  if (!trimmed || trimmed.toLowerCase() === "none" || trimmed.toLowerCase() === "no known allergies") {
    return [];
  }
  const items = trimmed
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length > 0 &&
        s.toLowerCase() !== "none" &&
        s.toLowerCase() !== "no known allergies"
    );

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  return unique;
}
