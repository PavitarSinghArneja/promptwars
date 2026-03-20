/**
 * Aegis Bridge — ElevenLabs TTS Proxy
 * POST { text, voiceId? } → streams audio/mpeg back to client.
 * API key stays server-side only.
 */
import { NextRequest, NextResponse } from "next/server";

const VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // ElevenLabs "Sarah" — calm, clinical

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  let body: { text?: string; voiceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  // If no API key — return 503 so the client falls back to browser SpeechSynthesis
  if (!apiKey || apiKey === "placeholder") {
    return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 503 });
  }

  const voiceId = body.voiceId ?? VOICE_ID;

  try {
    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.8 },
        }),
      }
    );

    if (!elRes.ok) {
      const err = await elRes.text();
      console.error("[ElevenLabs TTS]", elRes.status, err);
      return NextResponse.json({ error: "ElevenLabs error" }, { status: 502 });
    }

    // Stream audio back to the browser
    return new NextResponse(elRes.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[ElevenLabs TTS]", err);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
