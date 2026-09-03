import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function encodeReportId(url: string): string {
  return Buffer.from(url, "utf8").toString("base64url");
}

export function decodeReportId(id: string): string {
  return Buffer.from(id, "base64url").toString("utf8");
}

export function gradeColor(score: number): string {
  if (score >= 90) return "#2ea44f";
  if (score >= 75) return "#2f81f7";
  if (score >= 60) return "#d29922";
  if (score >= 40) return "#db6d28";
  return "#f85149";
}
