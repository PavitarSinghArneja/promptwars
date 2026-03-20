"use client";

/**
 * Aegis Bridge — Triage Results Panel
 * Renders HandoverCard + BystanderChecklist after successful Gemini inference.
 * Includes emergency SMS demo and tap-to-call 911 button.
 */
import { useRef, useEffect, useState, useCallback } from "react";
import { ChevronDown, Phone, MessageSquareWarning, Loader2, Check } from "lucide-react";
import type { TriageOutput } from "@/lib/triageSchema";
import HandoverCard from "./HandoverCard";
import BystanderChecklist from "./BystanderChecklist";

interface TriageResultsProps {
  data: TriageOutput;
  onReset: () => void;
}

type SmsState = "idle" | "sending" | "sent" | "error";

export default function TriageResults({ data, onReset }: TriageResultsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [smsState, setSmsState] = useState<SmsState>("idle");
  const [smsError, setSmsError] = useState<string | null>(null);

  // Auto-scroll to results on first render
  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const sendDemoAlert = useCallback(async () => {
    setSmsState("sending");
    setSmsError(null);
    try {
      const res = await fetch("/api/emergency/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triageLevel: data.triageLevel,
          summary: data.summary,
          name: data.name,
        }),
      });
      const json = await res.json() as { ok?: boolean; error?: string; mode?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed");
      setSmsState("sent");
      setTimeout(() => setSmsState("idle"), 4000);
    } catch (err) {
      setSmsError(err instanceof Error ? err.message : "SMS failed");
      setSmsState("error");
      setTimeout(() => setSmsState("idle"), 5000);
    }
  }, [data]);

  const isCritical = data.triageLevel === "CRITICAL" || data.triageLevel === "URGENT";

  return (
    <div ref={containerRef} className="flex flex-col gap-6">
      {/* Top bar */}
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

      {/* ── Emergency Action Bar ── */}
      <div
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-2xl"
        style={{
          background: isCritical ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${isCritical ? "rgba(239,68,68,0.3)" : "var(--color-border)"}`,
        }}
        role="group"
        aria-label="Emergency action buttons"
      >
        {/* TAP TO CALL 911 */}
        <a
          href="tel:911"
          className="flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-base font-bold transition-all hover:opacity-90 active:scale-95"
          style={{ background: "var(--color-critical)", color: "#fff" }}
          aria-label="Tap to call 911 — emergency services"
        >
          <Phone size={20} aria-hidden="true" />
          CALL 911
        </a>

        {/* Demo: Send SMS Alert */}
        <button
          type="button"
          onClick={sendDemoAlert}
          disabled={smsState === "sending" || smsState === "sent"}
          aria-label="Send demo emergency SMS alert"
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
          style={{
            background: smsState === "sent" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)",
            color: smsState === "sent" ? "var(--color-minor)" : "var(--color-text-secondary)",
            border: `1px solid ${smsState === "sent" ? "rgba(34,197,94,0.3)" : "var(--color-border)"}`,
          }}
        >
          {smsState === "sending" ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : smsState === "sent" ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <MessageSquareWarning size={16} aria-hidden="true" />
          )}
          {smsState === "sending" ? "Sending…" : smsState === "sent" ? "Alert Sent!" : "Demo: Send Alert"}
        </button>
      </div>

      {smsError && (
        <p role="alert" className="text-xs" style={{ color: "var(--color-urgent)" }}>
          SMS error: {smsError}
        </p>
      )}

      {/* ER Handover Card */}
      <HandoverCard data={data} />

      {/* Bystander Checklist */}
      {data.actions.length > 0 && <BystanderChecklist actions={data.actions} />}
    </div>
  );
}
