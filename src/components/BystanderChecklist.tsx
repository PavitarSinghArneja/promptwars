"use client";

/**
 * Aegis Bridge — Bystander "Now" Checklist
 * Large text, high contrast, numbered first-aid steps for non-medical users.
 * a11y: role="list", aria-label per step, urgency badge, high-contrast text
 */
import { useState } from "react";
import { CheckCircle2, Circle, AlertTriangle, Clock, Eye } from "lucide-react";
import type { TriageAction } from "@/lib/triageSchema";

const URGENCY_CONFIG = {
  immediate: {
    label: "NOW",
    icon: AlertTriangle,
    style: { color: "var(--color-critical)", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" },
  },
  soon: {
    label: "SOON",
    icon: Clock,
    style: { color: "var(--color-urgent)", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)" },
  },
  monitor: {
    label: "MONITOR",
    icon: Eye,
    style: { color: "var(--color-standard)", background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.3)" },
  },
};

interface BystanderChecklistProps {
  actions: TriageAction[];
}

export default function BystanderChecklist({ actions }: BystanderChecklistProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (step: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  const completedCount = checked.size;
  const totalCount = actions.length;

  return (
    <section aria-labelledby="checklist-title" className="glass-bright rounded-2xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.03)" }}
      >
        <h2 id="checklist-title" className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
          Bystander Action Checklist
        </h2>
        <div
          role="status"
          aria-live="polite"
          aria-label={`${completedCount} of ${totalCount} steps completed`}
          className="text-xs font-semibold tabular-nums px-3 py-1 rounded-full"
          style={{
            background: completedCount === totalCount && totalCount > 0 ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.08)",
            color: completedCount === totalCount && totalCount > 0 ? "var(--color-minor)" : "var(--color-text-muted)",
          }}
        >
          {completedCount} / {totalCount}
        </div>
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={completedCount}
        aria-valuemin={0}
        aria-valuemax={totalCount}
        aria-label={`${completedCount} of ${totalCount} steps completed`}
        className="h-1 w-full"
        style={{ background: "var(--color-surface-800)" }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{
            width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : "0%",
            background: "var(--color-minor)",
          }}
        />
      </div>

      {/* Steps */}
      <ol
        role="list"
        aria-label="Emergency first-aid steps"
        className="flex flex-col divide-y"
        style={{ borderColor: "var(--color-border)" }}
      >
        {actions.map((action) => {
          const isChecked = checked.has(action.step);
          const urgency = URGENCY_CONFIG[action.urgency];
          const UrgencyIcon = urgency.icon;

          return (
            <li key={action.step} role="listitem">
              <button
                type="button"
                onClick={() => toggle(action.step)}
                aria-pressed={isChecked}
                aria-label={`Step ${action.step}: ${action.instruction}. Urgency: ${action.urgency}. ${isChecked ? "Completed. Click to unmark." : "Click to mark as done."}`}
                className="w-full flex items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]"
                style={{ opacity: isChecked ? 0.6 : 1 }}
              >
                {/* Checkbox indicator */}
                <span className="mt-1 shrink-0" aria-hidden="true">
                  {isChecked ? (
                    <CheckCircle2 size={22} style={{ color: "var(--color-minor)" }} />
                  ) : (
                    <Circle size={22} style={{ color: "var(--color-text-muted)" }} />
                  )}
                </span>

                {/* Step number + content */}
                <span className="flex flex-col gap-1.5 flex-1">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-md tabular-nums"
                      aria-hidden="true"
                      style={{ background: "rgba(255,255,255,0.08)", color: "var(--color-text-muted)" }}
                    >
                      Step {action.step}
                    </span>
                    <span
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                      aria-hidden="true"
                      style={urgency.style}
                    >
                      <UrgencyIcon size={10} />
                      {urgency.label}
                    </span>
                  </span>

                  <span
                    className="text-base font-medium leading-snug"
                    style={{
                      color: "var(--color-text-primary)",
                      textDecoration: isChecked ? "line-through" : "none",
                    }}
                  >
                    {action.instruction}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* All done banner */}
      {completedCount === totalCount && totalCount > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center gap-2 py-4 text-sm font-semibold"
          style={{ background: "rgba(34,197,94,0.08)", color: "var(--color-minor)" }}
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          All steps completed — await professional help
        </div>
      )}
    </section>
  );
}
