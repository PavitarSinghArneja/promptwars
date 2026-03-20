/**
 * Aegis Bridge — Triage Output Schema
 * Shared type definitions for the Gemini structured response
 */

export type TriageLevel = "CRITICAL" | "URGENT" | "STANDARD" | "MINOR";

export interface TriageAction {
  step: number;
  instruction: string;
  urgency: "immediate" | "soon" | "monitor";
}

export interface TriageOutput {
  /** Patient identifier or "Unknown" */
  name: string;
  /** Age if determinable, else null */
  age: number | null;
  /** Known allergies */
  allergies: string[];
  /** Current medications */
  medications: string[];
  /** Observed or reported vital signs */
  vitals: {
    heartRate?: string;
    bloodPressure?: string;
    temperature?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
    painLevel?: string;
  };
  /** Triage classification */
  triageLevel: TriageLevel;
  /** Primary complaint or injury summary */
  summary: string;
  /** Recommended specialty for ER routing */
  recommendedSpecialty: string;
  /** Bystander first-aid action steps */
  actions: TriageAction[];
  /** Confidence percentage 0–100 */
  confidence: number;
  /** Timestamp ISO string */
  processedAt: string;
}
