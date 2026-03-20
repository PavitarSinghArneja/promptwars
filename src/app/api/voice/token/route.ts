/**
 * Aegis Bridge — ElevenLabs WebRTC Conversation Token
 * GET /api/voice/token
 * Returns a signed token for the Aegis conversational AI agent.
 * ELEVENLABS_API_KEY stays server-side — never exposed to the client.
 */
import { NextResponse } from "next/server";

const AGENT_ID = "agent_7701km5bbrxcfpbrqxkm8ypztmty";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey || apiKey === "placeholder") {
    return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${AGENT_ID}`,
      { headers: { "xi-api-key": apiKey } }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[ElevenLabs token]", res.status, err);
      return NextResponse.json({ error: "Failed to get token" }, { status: 502 });
    }

    const data = await res.json() as { token?: string };
    return NextResponse.json({ token: data.token, agentId: AGENT_ID });
  } catch (err) {
    console.error("[ElevenLabs token]", err);
    return NextResponse.json({ error: "Token fetch failed" }, { status: 500 });
  }
}
