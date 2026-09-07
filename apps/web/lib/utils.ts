import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function encodeReportId(url: string): string {
  const bytes = new TextEncoder().encode(url);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeReportId(id: string): string {
  const replaced = id.replace(/-/g, "+").replace(/_/g, "/");
  const padded = replaced + "=".repeat((4 - (replaced.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodePageId(url: string): string {
  return encodeReportId(url);
}

export function decodePageId(id: string): string {
  return decodeReportId(id);
}

export function gradeColor(score: number): string {
  if (score >= 90) return "#16a34a";
  if (score >= 75) return "#2563eb";
  if (score >= 60) return "#ca8a04";
  if (score >= 40) return "#ea580c";
  return "#dc2626";
}

export function friendlyError(message: string): string {
  if (/timed out/i.test(message)) return "The server did not respond within 10 seconds.";
  if (/SSRF|Blocked|private|localhost/i.test(message)) {
    return "That URL is not allowed. AgentLens only analyzes public http(s) websites.";
  }
  if (/ENOTFOUND|resolve|DNS/i.test(message)) return "The hostname could not be resolved.";
  return message;
}
