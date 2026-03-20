/**
 * Aegis Bridge — Triage Level Badge
 * Color-coded: CRITICAL (red pulse) / URGENT (orange) / STANDARD (amber) / MINOR (green)
 */
import { type TriageLevel } from "@/lib/triageSchema";

const CONFIG: Record<TriageLevel, { label: string; cssClass: string; ariaLabel: string }> = {
  CRITICAL: {
    label: "CRITICAL",
    cssClass: "badge-critical",
    ariaLabel: "Triage level Critical — life-threatening, immediate action required",
  },
  URGENT: {
    label: "URGENT",
    cssClass: "badge-urgent",
    ariaLabel: "Triage level Urgent — serious, act within minutes",
  },
  STANDARD: {
    label: "STANDARD",
    cssClass: "badge-standard",
    ariaLabel: "Triage level Standard — stable but needs care soon",
  },
  MINOR: {
    label: "MINOR",
    cssClass: "badge-minor",
    ariaLabel: "Triage level Minor — non-urgent",
  },
};

interface TriageBadgeProps {
  level: TriageLevel;
  size?: "sm" | "lg";
}

export default function TriageBadge({ level, size = "sm" }: TriageBadgeProps) {
  const cfg = CONFIG[level];
  return (
    <span
      role="status"
      aria-label={cfg.ariaLabel}
      className={`inline-flex items-center gap-1.5 rounded-full font-bold tracking-widest uppercase ${cfg.cssClass}`}
      style={{
        fontSize: size === "lg" ? "1rem" : "0.7rem",
        padding: size === "lg" ? "0.5rem 1.25rem" : "0.25rem 0.75rem",
      }}
    >
      <span className="inline-block w-2 h-2 rounded-full bg-current" aria-hidden="true" />
      {cfg.label}
    </span>
  );
}
