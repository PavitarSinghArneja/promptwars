/**
 * Aegis Bridge — Gemini Client via Google Gen AI SDK (Vertex AI backend)
 * Uses @google/genai with vertexai:true — authenticates via GCP ADC on Cloud Run.
 * No API key needed in production; falls back to API key for local dev.
 *
 * IMPORTANT: MODEL_ID must stay "gemini-2.5-flash" — confirmed available on
 * project sodium-sublime-490805-t9. Do NOT change it.
 */
import { GoogleGenAI, type Part } from "@google/genai";
import type { TriageOutput } from "./triageSchema";

const PROJECT  = process.env.GOOGLE_CLOUD_PROJECT_ID ?? "sodium-sublime-490805-t9";
const LOCATION = process.env.GOOGLE_CLOUD_REGION    ?? "us-central1";

function getAI(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey || apiKey === "placeholder") {
    return new GoogleGenAI({ vertexai: true, project: PROJECT, location: LOCATION });
  }
  return new GoogleGenAI({ apiKey });
}

// IMPORTANT: do not change this model ID — see file header comment
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
8. CRITICAL — Use ONLY information explicitly present in the inputs. Never invent or assume patient names, ages, allergies, medications, or vitals that are not stated. If the name is "test" or a placeholder, output it exactly as given. Do NOT substitute real-sounding names.

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

/** Extract only non-thinking text parts from a Gemini response candidate */
function extractOutputText(response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>): string {
  // gemini-2.5-flash uses thinking mode by default on Vertex AI.
  // Thinking parts have { thought: true } and must be excluded —
  // they can consume the entire token budget before the JSON output is written.
  const candidates = (response as unknown as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>
  }).candidates ?? [];

  const outputParts = candidates[0]?.content?.parts ?? [];
  const fromParts = outputParts
    .filter((p) => !p.thought) // skip thinking tokens
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  if (fromParts) return fromParts;

  // Fallback: response.text getter (concatenates all parts including thinking)
  try {
    return (response.text ?? "").trim();
  } catch {
    return "";
  }
}

export async function runTriageInference(input: GeminiTriageInput): Promise<TriageOutput> {
  const ai = getAI();

  const parts: Part[] = [];

  parts.push({
    text: `Emergency triage request received at ${new Date().toISOString()}. Analyse all provided inputs and return the JSON triage report.`,
  });

  for (const img of input.images) {
    parts.push({ inlineData: { data: img.base64, mimeType: img.mimeType } });
    parts.push({ text: `Image file: ${img.name}` });
  }

  if (input.audio) {
    parts.push({ inlineData: { data: input.audio.base64, mimeType: input.audio.mimeType } });
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
      maxOutputTokens: 8192,   // increased: thinking mode was filling up 2048
      // Disable thinking — not needed for structured JSON, and it consumed
      // the entire token budget leaving no room for the actual JSON output.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const rawText = extractOutputText(response);
  console.log("[Gemini] raw output length:", rawText.length, "| first 120:", rawText.slice(0, 120));

  // Extract JSON object: find first { and last } regardless of surrounding prose/fences
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Gemini returned no JSON object. Raw (first 400): ${rawText.slice(0, 400)}`);
  }
  const jsonText = rawText.slice(start, end + 1);

  let parsed: TriageOutput;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Gemini JSON parse failed. Extracted (first 400): ${jsonText.slice(0, 400)}`);
  }

  if (!parsed.processedAt) {
    parsed.processedAt = new Date().toISOString();
  }

  return parsed;
}
