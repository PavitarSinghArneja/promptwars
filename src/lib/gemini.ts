/**
 * Aegis Bridge — Gemini Client via Google Gen AI SDK (Vertex AI backend)
 * Uses @google/genai with vertexai:true — authenticates via GCP ADC on Cloud Run.
 * No API key needed in production; falls back to API key for local dev.
 */
import { GoogleGenAI, type Part } from "@google/genai";
import type { TriageOutput } from "./triageSchema";

const PROJECT  = process.env.GOOGLE_CLOUD_PROJECT_ID ?? "sodium-sublime-490805-t9";
const LOCATION = process.env.GOOGLE_CLOUD_REGION    ?? "us-central1";

// Vertex AI on Cloud Run (ADC) — no API key needed
// For local dev, set GOOGLE_GEMINI_API_KEY and the SDK uses AI Studio
function getAI(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  // If running on Cloud Run (no API key set or key is placeholder), use Vertex AI
  if (!apiKey || apiKey === "placeholder") {
    return new GoogleGenAI({ vertexai: true, project: PROJECT, location: LOCATION });
  }
  // Local dev: use AI Studio key
  return new GoogleGenAI({ apiKey });
}

// Vertex AI model ID — confirmed available on this project
const MODEL_ID = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are Aegis Bridge, an expert emergency medical triage AI assistant.
Your job is to analyse multimodal emergency inputs (images, audio transcripts, text) and produce a structured JSON triage report.

RULES:
1. Respond ONLY with valid JSON matching the schema exactly — no markdown fences, no prose.
2. Be clinical, factual, and concise. Avoid speculation beyond what evidence supports.
3. For triageLevel use exactly one of: CRITICAL | URGENT | STANDARD | MINOR
4. If information is absent use null for optional fields or empty arrays.
5. Bystander actions must be numbered, plain English, and immediately actionable.
6. recommendedSpecialty must be a valid ER specialty (e.g. "Trauma Surgery", "Cardiology", "Neurology", "General Emergency").
7. confidence is a 0–100 integer reflecting how complete the input data is.

OUTPUT SCHEMA (strict — no extra fields):
{
  "name": string | "Unknown",
  "age": number | null,
  "allergies": string[],
  "medications": string[],
  "vitals": {
    "heartRate": string | null,
    "bloodPressure": string | null,
    "temperature": string | null,
    "respiratoryRate": string | null,
    "oxygenSaturation": string | null,
    "painLevel": string | null
  },
  "triageLevel": "CRITICAL" | "URGENT" | "STANDARD" | "MINOR",
  "summary": string,
  "recommendedSpecialty": string,
  "actions": [
    { "step": number, "instruction": string, "urgency": "immediate" | "soon" | "monitor" }
  ],
  "confidence": number,
  "processedAt": string
}`;

export interface GeminiTriageInput {
  images: { base64: string; mimeType: string; name: string }[];
  audio: { base64: string; mimeType: string; durationSec: number } | null;
  notes: string;
}

export async function runTriageInference(input: GeminiTriageInput): Promise<TriageOutput> {
  const ai = getAI();

  const parts: Part[] = [];

  parts.push({
    text: `Emergency triage request received at ${new Date().toISOString()}. Analyse all provided inputs and return the JSON triage report.`,
  });

  for (const img of input.images) {
    parts.push({
      inlineData: {
        data: img.base64,
        mimeType: img.mimeType,
      },
    });
    parts.push({ text: `Image file: ${img.name}` });
  }

  if (input.audio) {
    parts.push({
      inlineData: {
        data: input.audio.base64,
        mimeType: input.audio.mimeType,
      },
    });
    parts.push({ text: `Audio recording: ${input.audio.durationSec}s. Transcribe and use as eyewitness/victim description.` });
  }

  if (input.notes) {
    parts.push({ text: `Additional notes:\n${input.notes}` });
  }

  parts.push({ text: "Return the JSON triage report now:" });

  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.1,
      topP: 0.8,
      maxOutputTokens: 2048,
    },
  });

  // `text` is a getter property in @google/genai (not a function)
  const rawText = (response.text ?? "").trim();

  // Robustly extract JSON: find first { and last } regardless of surrounding
  // prose or markdown fences Gemini may prepend/append.
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Gemini returned no JSON object: ${rawText.slice(0, 300)}`);
  }
  const jsonText = rawText.slice(start, end + 1);

  let parsed: TriageOutput;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Gemini JSON parse failed: ${jsonText.slice(0, 300)}`);
  }

  if (!parsed.processedAt) {
    parsed.processedAt = new Date().toISOString();
  }

  return parsed;
}
