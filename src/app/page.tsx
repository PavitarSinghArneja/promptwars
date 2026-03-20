"use client";

/**
 * Aegis Bridge — Home / Triage Page
 * Landing hero + multi-modal triage workspace + results display
 */
import { useState } from "react";
import { ShieldAlert, Mic, ImageIcon, FileText, MapPin, ArrowRight } from "lucide-react";
import TriageWorkspace from "@/components/TriageWorkspace";
import type { TriageOutput } from "@/lib/triageSchema";

const features = [
  {
    icon: Mic,
    title: "Voice Input",
    description: "Panicked witness descriptions processed in real-time via Gemini multimodal.",
    color: "var(--color-accent)",
  },
  {
    icon: ImageIcon,
    title: "Visual Analysis",
    description: "Medication bottles, wounds, IDs — drag, drop, and instantly structured.",
    color: "var(--color-urgent)",
  },
  {
    icon: FileText,
    title: "Medical Notes",
    description: "Paste any unstructured text — allergy lists, doctor notes, prescriptions.",
    color: "var(--color-standard)",
  },
  {
    icon: MapPin,
    title: "Hospital Routing",
    description: "Nearest specialty hospital with live ETA via Google Maps Platform.",
    color: "var(--color-minor)",
  },
];

export default function Home() {
  const [triageResult, setTriageResult] = useState<TriageOutput | null>(null);

  return (
    <>
      {/* ── Hero Section ───────────────────────────────────────── */}
      <section
        aria-labelledby="hero-heading"
        className="relative flex flex-col items-center justify-center text-center px-4 py-20 sm:py-28 overflow-hidden"
      >
        {/* Decorative background glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(239,68,68,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Shield icon */}
        <div
          className="mb-6 flex items-center justify-center w-20 h-20 rounded-2xl glass"
          aria-hidden="true"
        >
          <ShieldAlert size={40} strokeWidth={2} style={{ color: "var(--color-critical)" }} />
        </div>

        {/* Status pill */}
        <div
          className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
          role="status"
          aria-label="Triage system status: ready"
          style={{
            background: "rgba(239,68,68,0.1)",
            color: "var(--color-critical)",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-current animate-pulse" aria-hidden="true" />
          Emergency Triage Ready
        </div>

        <h1
          id="hero-heading"
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-3xl"
          style={{ color: "var(--color-text-primary)", lineHeight: 1.1 }}
        >
          Precision in{" "}
          <span style={{ color: "var(--color-critical)" }}>Chaos</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl max-w-2xl" style={{ color: "var(--color-text-secondary)" }}>
          Aegis Bridge converts messy real-world inputs — voice, photos, medical notes —
          into structured, life-saving emergency actions. Powered by{" "}
          <strong style={{ color: "var(--color-text-primary)" }}>Vertex AI Gemini 2.0 Flash</strong>.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <a
            href="#triage"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ background: "var(--color-critical)", color: "#fff" }}
            aria-label="Jump to triage workspace"
          >
            Start Triage
            <ArrowRight size={18} aria-hidden="true" />
          </a>
          <a
            href="#hospital-map"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold transition-all hover:bg-white/10 glass"
            style={{ color: "var(--color-text-primary)" }}
            aria-label="Find nearest hospital"
          >
            <MapPin size={18} aria-hidden="true" />
            Find Hospital
          </a>
        </div>
      </section>

      {/* ── Feature Cards ──────────────────────────────────────── */}
      <section id="features" aria-labelledby="features-heading" className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2
            id="features-heading"
            className="text-2xl font-bold text-center mb-10"
            style={{ color: "var(--color-text-primary)" }}
          >
            Zero Cognitive Load When It Matters Most
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="list" aria-label="Key features">
            {features.map(({ icon: Icon, title, description, color }) => (
              <article
                key={title}
                role="listitem"
                className="glass p-6 flex flex-col gap-4 transition-all hover:bg-white/[0.06] hover:-translate-y-1"
              >
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-xl"
                  aria-hidden="true"
                  style={{ background: `${color}18` }}
                >
                  <Icon size={24} style={{ color }} />
                </div>
                <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Triage Workspace ───────────────────────────────────── */}
      <section id="triage" aria-labelledby="triage-heading" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2
            id="triage-heading"
            className="text-2xl font-bold mb-8"
            style={{ color: "var(--color-text-primary)" }}
          >
            Triage Workspace
          </h2>
          <div className="glass p-6 sm:p-8">
            <TriageWorkspace onResult={setTriageResult} />
          </div>

          {/* Results placeholder — populated by Module 4 */}
          {triageResult && (
            <div
              role="status"
              aria-live="polite"
              aria-label="Triage result received"
              className="mt-6 glass p-4 text-sm"
              style={{ color: "var(--color-minor)" }}
            >
              ✓ Triage complete — triage level: {triageResult.triageLevel}. Output card renders below (Module 4).
            </div>
          )}
        </div>
      </section>

      {/* ── Hospital Map placeholder ───────────────────────────── */}
      <section id="hospital-map" aria-labelledby="map-heading" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2
            id="map-heading"
            className="text-2xl font-bold mb-8"
            style={{ color: "var(--color-text-primary)" }}
          >
            Hospital Routing
          </h2>
          <div
            className="glass p-12 flex flex-col items-center justify-center text-center gap-4 min-h-64"
            aria-label="Hospital map — loading in Module 5"
          >
            <MapPin size={32} style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
            <p className="text-base" style={{ color: "var(--color-text-muted)" }}>
              Google Maps hospital routing loads here (Module 5)
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
