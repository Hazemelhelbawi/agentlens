import type { Severity } from "@agentlens/shared";

export const SEVERITY_META: Record<
  Severity,
  { label: string; icon: string; className: string; chip: string }
> = {
  critical: {
    label: "Critical",
    icon: "●",
    className: "text-red-600 dark:text-red-400",
    chip: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900",
  },
  warning: {
    label: "Warning",
    icon: "●",
    className: "text-amber-600 dark:text-amber-400",
    chip: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  },
  info: {
    label: "Info",
    icon: "●",
    className: "text-blue-600 dark:text-blue-400",
    chip: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900",
  },
  pass: {
    label: "Passed",
    icon: "●",
    className: "text-emerald-600 dark:text-emerald-400",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
  },
};

export function gradeLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs Work";
  return "Poor";
}
