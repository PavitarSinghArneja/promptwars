/**
 * Aegis Bridge — POST /api/triage
 * Server-side multimodal triage endpoint.
 * Security: API key server-only, input sanitization, rate limiting, no secrets in response.
 */
import { NextRequest, NextResponse } from "next/server";
import { runTriageInference, type GeminiTriageInput } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rateLimit";

// Max body size guard: 20MB (4 images × ~5MB each)
const MAX_BODY_BYTES = 20 * 1024 * 1024;

/** Sanitize a string: strip control characters, trim, truncate */
function sanitizeString(val: unknown, maxLen = 5000): string {
  if (typeof val !== "string") return "";
  return val
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // strip control chars
    .trim()
    .slice(0, maxLen);
}

/** Validate base64 string (must be non-empty, reasonable length) */
function isValidBase64(val: unknown): val is string {
  if (typeof val !== "string" || val.length === 0) return false;
  if (val.length > 20 * 1024 * 1024) return false; // 20MB limit per field
  return /^[A-Za-z0-9+/=\r\n]+$/.test(val);
}

/** Validate MIME type against allowlist */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/webm;codecs=opus", "audio/ogg"];

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Rate Limiting ───────────────────────────────────────────
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const { allowed, remaining, resetAt } = checkRateLimit(ip);
  const rateLimitHeaders = {
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
  };

  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before trying again." },
      { status: 429, headers: rateLimitHeaders }
    );
  }

  // ── Body Size Guard ─────────────────────────────────────────
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Request body too large. Max 20MB." },
      { status: 413 }
    );
  }

  // ── Parse & Validate Body ───────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  // Validate images array
  const rawImages = Array.isArray(raw.images) ? raw.images : [];
  if (rawImages.length > 4) {
    return NextResponse.json({ error: "Maximum 4 images allowed." }, { status: 400 });
  }

  const images: GeminiTriageInput["images"] = [];
  for (const img of rawImages) {
    if (typeof img !== "object" || img === null) continue;
    const i = img as Record<string, unknown>;
    if (!isValidBase64(i.base64)) {
      return NextResponse.json({ error: "Invalid image base64 data." }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(String(i.mimeType))) {
      return NextResponse.json({ error: `Unsupported image type: ${i.mimeType}` }, { status: 400 });
    }
    images.push({
      base64: i.base64 as string,
      mimeType: String(i.mimeType),
      name: sanitizeString(i.name, 255) || "image",
    });
  }

  // Validate audio
  let audio: GeminiTriageInput["audio"] = null;
  if (raw.audio !== null && typeof raw.audio === "object") {
    const a = raw.audio as Record<string, unknown>;
    if (!isValidBase64(a.base64)) {
      return NextResponse.json({ error: "Invalid audio base64 data." }, { status: 400 });
    }
    const mimeType = String(a.mimeType ?? "");
    // Normalize codec variant
    const normalizedMime = mimeType.split(";")[0].trim();
    if (!ALLOWED_AUDIO_TYPES.some((t) => t.startsWith(normalizedMime))) {
      return NextResponse.json({ error: `Unsupported audio type: ${mimeType}` }, { status: 400 });
    }
    const durationSec = typeof a.durationSec === "number" ? Math.min(a.durationSec, 300) : 0;
    audio = { base64: a.base64 as string, mimeType, durationSec };
  }

  // Validate notes
  const notes = sanitizeString(raw.notes, 4000);

  // Must have at least one input
  if (images.length === 0 && audio === null && notes.length === 0) {
    return NextResponse.json(
      { error: "At least one input is required: image, audio, or notes." },
      { status: 400 }
    );
  }

  // ── Run Gemini Inference ────────────────────────────────────
  try {
    const result = await runTriageInference({ images, audio, notes });
    return NextResponse.json(result, { status: 200, headers: rateLimitHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown inference error";
    console.error("[/api/triage] Gemini error:", message);

    // Don't leak internal error details to client
    return NextResponse.json(
      { error: "Triage inference failed. Please try again." },
      { status: 502 }
    );
  }
}
