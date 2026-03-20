"use client";

/**
 * Aegis Bridge — ER Handover Card
 * Printable, structured patient summary for paramedics / ER staff
 * a11y: semantic table/dl structure, ARIA labels, keyboard copy
 */
import { useState, useCallback, useRef } from "react";
import { Printer, Copy, Check, User, AlertCircle, Pill, Activity, Clock } from "lucide-react";
import type { TriageOutput } from "@/lib/triageSchema";
import TriageBadge from "./TriageBadge";

interface HandoverCardProps {
  data: TriageOutput;
}

function VitalRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: "var(--color-border)" }}>
      <dt className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</dt>
      <dd className="text-sm font-semibold tabular-nums" style={{ color: "var(--color-text-primary)" }}>{value}</dd>
    </div>
  );
}

export default function HandoverCard({ data }: HandoverCardProps) {
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  const handleCopy = useCallback(async () => {
    const text = `AEGIS BRIDGE — ER HANDOVER CARD
Generated: ${new Date(data.processedAt).toLocaleString()}
Triage Level: ${data.triageLevel}

PATIENT: ${data.name}${data.age ? ` | Age: ${data.age}` : ""}
SUMMARY: ${data.summary}
SPECIALTY: ${data.recommendedSpecialty}

ALLERGIES: ${data.allergies.length ? data.allergies.join(", ") : "None known"}
MEDICATIONS: ${data.medications.length ? data.medications.join(", ") : "None known"}

VITALS:
${Object.entries(data.vitals).filter(([, v]) => v).map(([k, v]) => `  ${k}: ${v}`).join("\n")}

BYSTANDER ACTIONS:
${data.actions.map((a) => `  ${a.step}. [${a.urgency.toUpperCase()}] ${a.instruction}`).join("\n")}

Confidence: ${data.confidence}%`;

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [data]);

  const handlePrint = () => window.print();

  const hasAllergies = data.allergies.length > 0;
  const hasMeds = data.medications.length > 0;
  const hasVitals = Object.values(data.vitals).some(Boolean);

  return (
    <article
      ref={cardRef}
      aria-labelledby="handover-title"
      className="glass-bright rounded-2xl overflow-hidden"
    >
      {/* Header bar */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 border-b"
        style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.03)" }}
      >
        <div className="flex flex-col gap-2">
          <h2 id="handover-title" className="text-base font-bold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
            ER Handover Card
          </h2>
          <TriageBadge level={data.triageLevel} size="lg" />
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? "Copied to clipboard" : "Copy handover card to clipboard"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.08)", color: "var(--color-text-secondary)" }}
          >
            {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            aria-label="Print handover card"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.08)", color: "var(--color-text-secondary)" }}
          >
            <Printer size={12} aria-hidden="true" />
            Print
          </button>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Patient info */}
        <div className="flex flex-col gap-5">
          {/* Identity */}
          <section aria-labelledby="patient-id-label">
            <h3 id="patient-id-label" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
              <User size={12} aria-hidden="true" />
              Patient
            </h3>
            <dl className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-2">
                <dt className="sr-only">Name</dt>
                <dd className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>{data.name}</dd>
                {data.age && (
                  <dd className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Age {data.age}</dd>
                )}
              </div>
              <dt className="sr-only">Summary</dt>
              <dd className="text-sm mt-1 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{data.summary}</dd>
              <dt className="sr-only">Recommended specialty</dt>
              <dd className="mt-2 text-xs font-medium px-3 py-1 rounded-full w-fit" style={{ background: "rgba(99,102,241,0.12)", color: "var(--color-accent)" }}>
                → {data.recommendedSpecialty}
              </dd>
            </dl>
          </section>

          {/* Allergies */}
          <section aria-labelledby="allergy-label">
            <h3 id="allergy-label" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
              <AlertCircle size={12} aria-hidden="true" />
              Allergies
            </h3>
            {hasAllergies ? (
              <ul aria-label="Known allergies" className="flex flex-wrap gap-2">
                {data.allergies.map((a) => (
                  <li key={a} className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: "rgba(239,68,68,0.12)", color: "var(--color-critical)" }}>
                    {a}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>None known</p>
            )}
          </section>

          {/* Medications */}
          <section aria-labelledby="meds-label">
            <h3 id="meds-label" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
              <Pill size={12} aria-hidden="true" />
              Current Medications
            </h3>
            {hasMeds ? (
              <ul aria-label="Current medications" className="flex flex-col gap-1">
                {data.medications.map((m) => (
                  <li key={m} className="text-sm" style={{ color: "var(--color-text-secondary)" }}>• {m}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>None known</p>
            )}
          </section>
        </div>

        {/* Right column: Vitals */}
        <div className="flex flex-col gap-5">
          {hasVitals && (
            <section aria-labelledby="vitals-label">
              <h3 id="vitals-label" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
                <Activity size={12} aria-hidden="true" />
                Vital Signs
              </h3>
              <dl className="flex flex-col">
                <VitalRow label="Heart Rate" value={data.vitals.heartRate} />
                <VitalRow label="Blood Pressure" value={data.vitals.bloodPressure} />
                <VitalRow label="Temperature" value={data.vitals.temperature} />
                <VitalRow label="Respiratory Rate" value={data.vitals.respiratoryRate} />
                <VitalRow label="O₂ Saturation" value={data.vitals.oxygenSaturation} />
                <VitalRow label="Pain Level" value={data.vitals.painLevel} />
              </dl>
            </section>
          )}

          {/* Metadata */}
          <section aria-labelledby="meta-label" className="mt-auto">
            <h3 id="meta-label" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
              <Clock size={12} aria-hidden="true" />
              Report Info
            </h3>
            <dl className="flex flex-col gap-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
              <div className="flex justify-between">
                <dt>Generated</dt>
                <dd>{new Date(data.processedAt).toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt>AI Confidence</dt>
                <dd
                  style={{ color: data.confidence >= 70 ? "var(--color-minor)" : data.confidence >= 40 ? "var(--color-standard)" : "var(--color-urgent)" }}
                >
                  {data.confidence}%
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Engine</dt>
                <dd>Gemini 3 Flash</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </article>
  );
}
