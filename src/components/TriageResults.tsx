"use client";

/**
 * Aegis Bridge — Triage Results Panel
 * Renders HandoverCard + BystanderChecklist after successful Gemini inference
 */
import { useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import type { TriageOutput } from "@/lib/triageSchema";
import HandoverCard from "./HandoverCard";
import BystanderChecklist from "./BystanderChecklist";

interface TriageResultsProps {
  data: TriageOutput;
  onReset: () => void;
}

export default function TriageResults({ data, onReset }: TriageResultsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to results on first render
  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col gap-6">
      {/* Scroll anchor + new triage button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-minor)" }}>
          <ChevronDown size={16} aria-hidden="true" />
          Triage analysis complete
        </div>
        <button
          type="button"
          onClick={onReset}
          aria-label="Start a new triage session"
          className="text-xs font-medium px-4 py-2 rounded-lg transition-all hover:bg-white/10"
          style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
        >
          New Triage
        </button>
      </div>

      {/* ER Handover Card */}
      <HandoverCard data={data} />

      {/* Bystander Checklist */}
      {data.actions.length > 0 && (
        <BystanderChecklist actions={data.actions} />
      )}
    </div>
  );
}
