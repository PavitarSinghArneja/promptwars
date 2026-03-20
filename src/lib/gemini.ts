/**
 * Aegis Bridge — Gemini Client (server-side only)
 * Wraps @google/generative-ai for multimodal triage inference.
 * All API calls MUST stay server-side — key never exposed to client.
 */
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type Part,
} from "@google/generative-ai";
import type { TriageOutput } from "./triageSchema";

// Key validated at call-time (not module load) so Next.js build doesn't crash
function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not set.");
  return new GoogleGenerativeAI(apiKey);
}

const MODEL_ID = "gemini-2.0-flash";

/** Safety settings — allow medical content while blocking truly harmful output */
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

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

/**
 * Run multimodal triage inference via Gemini 2.0 Flash.
 * Throws on API error; caller handles HTTP response.
 */
export async function runTriageInference(input: GeminiTriageInput): Promise<TriageOutput> {
  const model = getGenAI().getGenerativeModel({
    model: MODEL_ID,
    systemInstruction: SYSTEM_PROMPT,
    safetySettings,
    generationConfig: {
      temperature: 0.1,       // Low temperature for deterministic medical output
      topP: 0.8,
      maxOutputTokens: 2048,
    },
  });

  // Build multimodal parts array
  const parts: Part[] = [];

  // Text preamble
  parts.push({
    text: `Emergency triage request received at ${new Date().toISOString()}. Analyse all provided inputs and return the JSON triage report.`,
  });

  // Image parts
  for (const img of input.images) {
    parts.push({
      inlineData: {
        data: img.base64,
        mimeType: img.mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
      },
    });
    parts.push({ text: `Image file: ${img.name}` });
  }

  // Audio part (if present)
  if (input.audio) {
    parts.push({
      inlineData: {
        data: input.audio.base64,
        mimeType: input.audio.mimeType as "audio/webm" | "audio/ogg",
      },
    });
    parts.push({ text: `Audio recording duration: ${input.audio.durationSec}s. Please transcribe and use as eyewitness/victim description.` });
  }

  // Free-text notes
  if (input.notes) {
    parts.push({ text: `Additional notes from responder:\n${input.notes}` });
  }

  parts.push({ text: "Return the JSON triage report now:" });

  const result = await model.generateContent({ contents: [{ role: "user", parts }] });
  const rawText = result.response.text().trim();

  // Strip markdown fences if model wraps output despite instructions
  const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed: TriageOutput;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Gemini returned non-JSON output: ${rawText.slice(0, 200)}`);
  }

  // Ensure processedAt is set
  if (!parsed.processedAt) {
    parsed.processedAt = new Date().toISOString();
  }

  return parsed;
}
